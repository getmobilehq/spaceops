import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuditContextAdmin } from "@/lib/utils/audit";
import { sendReportEmail } from "@/lib/utils/email";
import { createNotification } from "@/lib/utils/notifications";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InspectionReport,
  type ReportData,
  type ReportInspection,
  type ReportDeficiency,
} from "@/lib/utils/pdf";
import React from "react";
import type {
  Building,
  Inspection,
  Deficiency,
  ReportConfig,
} from "@/lib/types/helpers";

/**
 * Parse schedule_cron string and check if report is due.
 * Format: "daily" | "weekly:0-6" | "biweekly:0-6" | "monthly:1-28"
 */
function isDue(config: ReportConfig): boolean {
  const { schedule_cron, last_sent_at } = config;
  if (!schedule_cron) return false;

  const now = new Date();
  const lastSent = last_sent_at ? new Date(last_sent_at) : null;

  if (schedule_cron === "daily") {
    // Due if never sent or last sent before today
    if (!lastSent) return true;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return lastSent < todayStart;
  }

  if (schedule_cron.startsWith("weekly:")) {
    const dayOfWeek = parseInt(schedule_cron.split(":")[1], 10);
    if (now.getDay() !== dayOfWeek) return false;
    if (!lastSent) return true;
    // Not sent in last 6 days
    return now.getTime() - lastSent.getTime() > 6 * 86400000;
  }

  if (schedule_cron.startsWith("biweekly:")) {
    const dayOfWeek = parseInt(schedule_cron.split(":")[1], 10);
    if (now.getDay() !== dayOfWeek) return false;
    if (!lastSent) return true;
    // Not sent in last 13 days
    return now.getTime() - lastSent.getTime() > 13 * 86400000;
  }

  if (schedule_cron.startsWith("monthly:")) {
    const dayOfMonth = parseInt(schedule_cron.split(":")[1], 10);
    if (now.getDate() !== dayOfMonth) return false;
    if (!lastSent) return true;
    // Not sent in last 27 days
    return now.getTime() - lastSent.getTime() > 27 * 86400000;
  }

  return false;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    await setAuditContextAdmin(supabase, null);

    // Find scheduled report configs that are enabled
    const { data: configsData } = await supabase
      .from("report_configs")
      .select("*")
      .eq("trigger_type", "scheduled")
      .eq("enabled", true);

    const configs = (configsData ?? []) as unknown as ReportConfig[];
    let reportsSent = 0;

    for (const config of configs) {
      if (!isDue(config)) continue;

      const emails = (config.recipient_emails ?? []) as unknown as string[];
      if (emails.length === 0) continue;

      // Fetch building
      const { data: buildingData } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", config.building_id)
        .single();

      const building = buildingData as unknown as Building | null;
      if (!building) continue;

      // Fetch org name
      const { data: orgData } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", building.org_id)
        .single();

      const orgName = (orgData as unknown as { name: string } | null)?.name ?? "";

      // Get spaces for building
      const { data: floorsData } = await supabase
        .from("floors")
        .select("id")
        .eq("building_id", building.id);

      const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
      let spaceIds: string[] = [];
      let spaceMap: Record<string, string> = {};

      if (floorIds.length > 0) {
        const { data: spacesData } = await supabase
          .from("spaces")
          .select("id, name")
          .in("floor_id", floorIds)
          .is("deleted_at", null);

        const spaces = (spacesData ?? []) as unknown as { id: string; name: string }[];
        spaceIds = spaces.map((s) => s.id);
        spaceMap = Object.fromEntries(spaces.map((s) => [s.id, s.name]));
      }

      const totalSpaces = spaceIds.length;

      // Last 30 days of inspections
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

      let inspections: Inspection[] = [];
      if (spaceIds.length > 0) {
        const { data: inspData } = await supabase
          .from("inspections")
          .select("*")
          .in("space_id", spaceIds)
          .eq("status", "completed")
          .gte("completed_at", thirtyDaysAgo.toISOString())
          .order("completed_at", { ascending: false });

        inspections = (inspData ?? []) as unknown as Inspection[];
      }

      // Fetch responses
      const inspIds = inspections.map((i) => i.id);
      let allResponses: { id: string; inspection_id: string; checklist_item_id: string; result: string | null }[] = [];
      if (inspIds.length > 0) {
        const { data: respData } = await supabase
          .from("inspection_responses")
          .select("id, inspection_id, checklist_item_id, result")
          .in("inspection_id", inspIds);

        allResponses = (respData ?? []) as unknown as typeof allResponses;
      }

      // Inspector names
      const inspectorIds = [...new Set(inspections.map((i) => i.inspector_id))];
      let userMap: Record<string, string> = {};
      if (inspectorIds.length > 0) {
        const { data: uData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", inspectorIds);

        userMap = Object.fromEntries(
          (uData ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
        );
      }

      // Build report inspections
      const reportInspections: ReportInspection[] = inspections.map((insp) => {
        const respForInsp = allResponses.filter((r) => r.inspection_id === insp.id);
        return {
          spaceName: spaceMap[insp.space_id] ?? "Unknown",
          inspectorName: userMap[insp.inspector_id] ?? "Unknown",
          completedAt: insp.completed_at!,
          passCount: respForInsp.filter((r) => r.result === "pass").length,
          failCount: respForInsp.filter((r) => r.result === "fail").length,
          responses: [],
        };
      });

      // KPIs
      const totalResponses = allResponses.length;
      const passResponses = allResponses.filter((r) => r.result === "pass").length;
      const passRate = totalResponses > 0 ? Math.round((passResponses / totalResponses) * 100) : null;
      const inspectedSpaceIds = new Set(inspections.map((i) => i.space_id));
      const completionRate = totalSpaces > 0 ? Math.round((inspectedSpaceIds.size / totalSpaces) * 100) : null;

      // Open deficiencies
      let deficiencies: ReportDeficiency[] = [];
      if (spaceIds.length > 0) {
        const { data: defData } = await supabase
          .from("deficiencies")
          .select("*")
          .in("space_id", spaceIds)
          .in("status", ["open", "in_progress"])
          .order("created_at", { ascending: false });

        const defs = (defData ?? []) as unknown as Deficiency[];
        deficiencies = defs.map((d) => ({
          number: d.deficiency_number,
          spaceName: spaceMap[d.space_id] ?? "Unknown",
          status: d.status,
          createdAt: d.created_at,
          resolutionComment: d.resolution_comment,
        }));
      }

      const reportDate = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const reportData: ReportData = {
        buildingName: building.name,
        buildingAddress: [building.street, building.city, building.state].filter(Boolean).join(", "),
        orgName,
        dateRange: {
          from: thirtyDaysAgo.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          to: reportDate,
        },
        generatedAt: now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        kpis: {
          passRate,
          totalInspections: inspections.length,
          openDeficiencies: deficiencies.length,
          completionRate,
        },
        inspections: reportInspections,
        deficiencies,
      };

      // Render PDF
      const pdfElement = React.createElement(InspectionReport, { data: reportData });
      const pdfBuffer = await renderToBuffer(pdfElement as never);

      // Send email
      await sendReportEmail({
        to: emails,
        buildingName: building.name,
        pdfBuffer: new Uint8Array(pdfBuffer),
        reportDate,
      });

      // Update last_sent_at
      await supabase
        .from("report_configs")
        .update({ last_sent_at: now.toISOString() })
        .eq("id", config.id);

      // Notify building admins
      const { data: assignedData } = await supabase
        .from("building_assignments")
        .select("user_id")
        .eq("building_id", building.id);

      const assignedUserIds = (assignedData ?? []).map((a: { user_id: string }) => a.user_id);
      for (const userId of assignedUserIds) {
        await createNotification({
          userId,
          type: "report_sent",
          message: `Scheduled report sent for ${building.name}`,
          link: `/reports`,
        });
      }

      reportsSent++;
    }

    return NextResponse.json({ checked: configs.length, reportsSent });
  } catch (err) {
    console.error("Scheduled reports cron error:", err);
    Sentry.captureException(err, { tags: { context: "cron" } });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
