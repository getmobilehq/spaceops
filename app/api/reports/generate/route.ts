import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { generateReportSchema } from "@/lib/validators/schemas";
import {
  InspectionReport,
  type ReportData,
  type ReportInspection,
  type ReportDeficiency,
} from "@/lib/utils/pdf";
import React from "react";
import type {
  Building,
  Organization,
  Inspection,
  Deficiency,
  InspectionResponse,
  UserProfile,
} from "@/lib/types/helpers";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = generateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { building_id, date_from, date_to, report_type } = parsed.data;

  // Fetch building
  const { data: buildingData } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", building_id)
    .single();

  const building = buildingData as unknown as Building | null;
  if (!building) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  // Fetch org
  const { data: orgData } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", building.org_id)
    .single();

  const orgName = (orgData as unknown as { name: string } | null)?.name ?? "";

  // Determine date range
  const now = new Date();
  const dateTo = date_to ? new Date(date_to) : now;
  dateTo.setHours(23, 59, 59, 999);

  const dateFrom = date_from
    ? new Date(date_from)
    : new Date(now.getTime() - 30 * 86400000);
  dateFrom.setHours(0, 0, 0, 0);

  // Get floors and spaces
  const { data: floorsData } = await supabase
    .from("floors")
    .select("id")
    .eq("building_id", building_id);

  const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);

  let spaceIds: string[] = [];
  if (floorIds.length > 0) {
    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id, name")
      .in("floor_id", floorIds)
      .is("deleted_at", null);

    spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
  }

  const totalSpaces = spaceIds.length;

  // Fetch inspections in date range
  let inspections: Inspection[] = [];
  if (spaceIds.length > 0) {
    const { data: inspData } = await supabase
      .from("inspections")
      .select("*")
      .in("space_id", spaceIds)
      .eq("status", "completed")
      .gte("completed_at", dateFrom.toISOString())
      .lte("completed_at", dateTo.toISOString())
      .order("completed_at", { ascending: false });

    inspections = (inspData ?? []) as unknown as Inspection[];
  }

  // Fetch responses for all inspections
  const inspIds = inspections.map((i) => i.id);
  let allResponses: (InspectionResponse & { item_desc?: string })[] = [];
  if (inspIds.length > 0) {
    const { data: respData } = await supabase
      .from("inspection_responses")
      .select("*")
      .in("inspection_id", inspIds);

    allResponses = (respData ?? []) as unknown as InspectionResponse[];
  }

  // Fetch checklist item descriptions
  const itemIds = [...new Set(allResponses.map((r) => r.checklist_item_id))];
  let itemMap: Record<string, string> = {};
  if (itemIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("checklist_items")
      .select("id, description")
      .in("id", itemIds);

    itemMap = Object.fromEntries(
      (itemsData ?? []).map((i: { id: string; description: string }) => [
        i.id,
        i.description,
      ])
    );
  }

  // Space name map
  let spaceMap: Record<string, string> = {};
  if (spaceIds.length > 0) {
    const { data: sData } = await supabase
      .from("spaces")
      .select("id, name")
      .in("id", spaceIds);

    spaceMap = Object.fromEntries(
      (sData ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
    );
  }

  // Inspector name map
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

  // Build inspection data
  const reportInspections: ReportInspection[] = inspections.map((insp) => {
    const respForInsp = allResponses.filter(
      (r) => r.inspection_id === insp.id
    );
    const passCount = respForInsp.filter((r) => r.result === "pass").length;
    const failCount = respForInsp.filter((r) => r.result === "fail").length;

    return {
      spaceName: spaceMap[insp.space_id] ?? "Unknown",
      inspectorName: userMap[insp.inspector_id] ?? "Unknown",
      completedAt: insp.completed_at!,
      passCount,
      failCount,
      responses: report_type === "detailed"
        ? respForInsp.map((r) => ({
            itemDescription: itemMap[r.checklist_item_id] ?? "Unknown item",
            result: r.result as "pass" | "fail",
            comment: r.comment,
            photoUrls: [],
          }))
        : [],
    };
  });

  // Calculate KPIs
  const totalResponses = allResponses.length;
  const passResponses = allResponses.filter((r) => r.result === "pass").length;
  const passRate =
    totalResponses > 0
      ? Math.round((passResponses / totalResponses) * 100)
      : null;

  const inspectedSpaceIds = new Set(inspections.map((i) => i.space_id));
  const completionRate =
    totalSpaces > 0
      ? Math.round((inspectedSpaceIds.size / totalSpaces) * 100)
      : null;

  // Fetch open deficiencies
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

  const reportData: ReportData = {
    buildingName: building.name,
    buildingAddress: [building.street, building.city, building.state]
      .filter(Boolean)
      .join(", "),
    orgName,
    dateRange: {
      from: dateFrom.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      to: dateTo.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
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

  const filename = `SpaceOps_Report_${building.name.replace(/\s+/g, "_")}_${dateFrom.toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
