import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuditContextAdmin } from "@/lib/utils/audit";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InspectionReport,
  type ReportData,
  type ReportInspection,
  type ReportDeficiency,
} from "@/lib/utils/pdf";
import { sendReportEmail } from "@/lib/utils/email";
import React from "react";
import type {
  Building,
  Inspection,
  InspectionResponse,
  Deficiency,
  ReportConfig,
} from "@/lib/types/helpers";

export async function POST(req: NextRequest) {
  try {
    const { building_id } = await req.json();
    if (!building_id) {
      return NextResponse.json(
        { error: "building_id required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    await setAuditContextAdmin(supabase, null);

    // Get building
    const { data: buildingData } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", building_id)
      .single();

    const building = buildingData as unknown as Building | null;
    if (!building) {
      return NextResponse.json(
        { error: "Building not found" },
        { status: 404 }
      );
    }

    // Count total spaces in building
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", building_id);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length === 0) {
      return NextResponse.json({ triggered: false, reason: "no_floors" });
    }

    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);

    const spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
    const totalSpaces = spaceIds.length;
    if (totalSpaces === 0) {
      return NextResponse.json({ triggered: false, reason: "no_spaces" });
    }

    // Count spaces inspected today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayInsp } = await supabase
      .from("inspections")
      .select("space_id")
      .in("space_id", spaceIds)
      .eq("status", "completed")
      .gte("completed_at", todayStart.toISOString());

    const inspectedToday = new Set(
      (todayInsp ?? []).map((i: { space_id: string }) => i.space_id)
    );

    if (inspectedToday.size < totalSpaces) {
      return NextResponse.json({
        triggered: false,
        reason: "incomplete",
        inspected: inspectedToday.size,
        total: totalSpaces,
      });
    }

    // All spaces inspected — check for completion trigger config
    const { data: configData } = await supabase
      .from("report_configs")
      .select("*")
      .eq("building_id", building_id)
      .eq("trigger_type", "on_completion")
      .eq("enabled", true)
      .maybeSingle();

    const config = configData as unknown as ReportConfig | null;
    const recipientEmails = Array.isArray(config?.recipient_emails)
      ? (config.recipient_emails as string[])
      : [];
    if (!config || recipientEmails.length === 0) {
      return NextResponse.json({
        triggered: false,
        reason: "no_config",
      });
    }

    // Generate report
    const now = new Date();
    const dateFrom = new Date(todayStart);

    // Fetch org name
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", building.org_id)
      .single();

    const orgName = (orgData as unknown as { name: string } | null)?.name ?? "";

    // Fetch today's inspections
    const { data: inspData } = await supabase
      .from("inspections")
      .select("*")
      .in("space_id", spaceIds)
      .eq("status", "completed")
      .gte("completed_at", todayStart.toISOString())
      .order("completed_at", { ascending: false });

    const inspections = (inspData ?? []) as unknown as Inspection[];
    const inspIds = inspections.map((i) => i.id);

    // Fetch responses
    let allResponses: InspectionResponse[] = [];
    if (inspIds.length > 0) {
      const { data: respData } = await supabase
        .from("inspection_responses")
        .select("*")
        .in("inspection_id", inspIds);
      allResponses = (respData ?? []) as unknown as InspectionResponse[];
    }

    // Space names
    const { data: sData } = await supabase
      .from("spaces")
      .select("id, name")
      .in("id", spaceIds);
    const spaceMap = Object.fromEntries(
      (sData ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
    );

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

    // Build report data
    const reportInspections: ReportInspection[] = inspections.map((insp) => {
      const resp = allResponses.filter((r) => r.inspection_id === insp.id);
      return {
        spaceName: spaceMap[insp.space_id] ?? "Unknown",
        inspectorName: userMap[insp.inspector_id] ?? "Unknown",
        completedAt: insp.completed_at!,
        passCount: resp.filter((r) => r.result === "pass").length,
        failCount: resp.filter((r) => r.result === "fail").length,
        responses: [],
      };
    });

    const totalResp = allResponses.length;
    const passResp = allResponses.filter((r) => r.result === "pass").length;
    const passRate = totalResp > 0 ? Math.round((passResp / totalResp) * 100) : null;

    // Fetch open deficiencies
    const { data: defData } = await supabase
      .from("deficiencies")
      .select("*")
      .in("space_id", spaceIds)
      .in("status", ["open", "in_progress"]);

    const defs = (defData ?? []) as unknown as Deficiency[];
    const deficiencies: ReportDeficiency[] = defs.map((d) => ({
      number: d.deficiency_number,
      spaceName: spaceMap[d.space_id] ?? "Unknown",
      status: d.status,
      createdAt: d.created_at,
      resolutionComment: d.resolution_comment,
    }));

    const reportDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const reportData: ReportData = {
      buildingName: building.name,
      buildingAddress: [building.street, building.city, building.state]
        .filter(Boolean)
        .join(", "),
      orgName,
      dateRange: { from: reportDate, to: reportDate },
      generatedAt: now.toLocaleString("en-US"),
      kpis: {
        passRate,
        totalInspections: inspections.length,
        openDeficiencies: defs.length,
        completionRate: 100,
      },
      inspections: reportInspections,
      deficiencies,
    };

    // Render PDF
    const pdfElement = React.createElement(InspectionReport, {
      data: reportData,
    });
    const pdfBuffer = await renderToBuffer(pdfElement as never);

    // Send email
    await sendReportEmail({
      to: recipientEmails,
      buildingName: building.name,
      pdfBuffer: new Uint8Array(pdfBuffer),
      reportDate,
    });

    // Update last_sent_at
    await supabase
      .from("report_configs")
      .update({ last_sent_at: now.toISOString() })
      .eq("id", config.id);

    return NextResponse.json({ triggered: true, sentTo: recipientEmails });
  } catch (err) {
    console.error("Webhook error:", err);
    Sentry.captureException(err, { tags: { context: "webhook" } });
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
