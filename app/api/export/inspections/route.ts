import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { exportInspectionsSchema } from "@/lib/validators/schemas";
import { toCsvString } from "@/lib/utils/csv";
import type { Inspection } from "@/lib/types/helpers";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = exportInspectionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const filters = parsed.data;

  let query = supabase
    .from("inspections")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (filters.date_from) {
    query = query.gte("completed_at", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("completed_at", filters.date_to);
  }

  const { data: inspData } = await query.limit(5000);
  const inspections = (inspData ?? []) as unknown as Inspection[];

  // Filter by building
  let filtered = inspections;
  if (filters.building_id) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", filters.building_id);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length > 0) {
      const { data: spacesData } = await supabase
        .from("spaces")
        .select("id")
        .in("floor_id", floorIds);

      const spaceIds = new Set((spacesData ?? []).map((s: { id: string }) => s.id));
      filtered = inspections.filter((i) => spaceIds.has(i.space_id));
    } else {
      filtered = [];
    }
  }

  // Enrich with space/building/inspector names
  const spaceIds = [...new Set(filtered.map((i) => i.space_id))];
  const inspectorIds = [...new Set(filtered.map((i) => i.inspector_id))];

  const [spacesResult, usersResult] = await Promise.all([
    spaceIds.length > 0
      ? supabase.from("spaces").select("id, name, floor_id").in("id", spaceIds)
      : Promise.resolve({ data: [] }),
    inspectorIds.length > 0
      ? supabase.from("users").select("id, name").in("id", inspectorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const spaces = (spacesResult.data ?? []) as unknown as { id: string; name: string; floor_id: string }[];
  const spaceNameMap = Object.fromEntries(spaces.map((s) => [s.id, s.name]));
  const userNameMap = Object.fromEntries(
    (usersResult.data ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
  );

  // Building names
  let buildingNameBySpace: Record<string, string> = {};
  const floorIds = [...new Set(spaces.map((s) => s.floor_id))];
  if (floorIds.length > 0) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id, building_id")
      .in("id", floorIds);

    const floors = (floorsData ?? []) as unknown as { id: string; building_id: string }[];
    const bIds = [...new Set(floors.map((f) => f.building_id))];

    const { data: buildingsData } = await supabase
      .from("buildings")
      .select("id, name")
      .in("id", bIds);

    const bNameMap = Object.fromEntries(
      (buildingsData ?? []).map((b: { id: string; name: string }) => [b.id, b.name])
    );
    const floorBuildingMap = Object.fromEntries(floors.map((f) => [f.id, f.building_id]));

    for (const s of spaces) {
      buildingNameBySpace[s.id] = bNameMap[floorBuildingMap[s.floor_id] ?? ""] ?? "";
    }
  }

  // Get response counts
  const inspIds = filtered.map((i) => i.id);
  let countMap: Record<string, { pass: number; fail: number }> = {};

  if (inspIds.length > 0) {
    const { data: respData } = await supabase
      .from("inspection_responses")
      .select("inspection_id, result")
      .in("inspection_id", inspIds);

    const responses = (respData ?? []) as unknown as { inspection_id: string; result: string }[];
    for (const r of responses) {
      if (!countMap[r.inspection_id]) countMap[r.inspection_id] = { pass: 0, fail: 0 };
      if (r.result === "pass") countMap[r.inspection_id].pass++;
      else if (r.result === "fail") countMap[r.inspection_id].fail++;
    }
  }

  const headers = ["Space", "Building", "Inspector", "Status", "Started At", "Completed At", "Pass Count", "Fail Count", "Pass Rate"];
  const rows = filtered.map((i) => {
    const counts = countMap[i.id] ?? { pass: 0, fail: 0 };
    const total = counts.pass + counts.fail;
    const passRate = total > 0 ? Math.round((counts.pass / total) * 100) : 0;
    return [
      spaceNameMap[i.space_id] ?? "",
      buildingNameBySpace[i.space_id] ?? "",
      userNameMap[i.inspector_id] ?? "",
      i.status,
      i.started_at ? new Date(i.started_at).toISOString() : "",
      i.completed_at ? new Date(i.completed_at).toISOString() : "",
      counts.pass,
      counts.fail,
      `${passRate}%`,
    ];
  });

  const csv = toCsvString(headers, rows);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spaceops_inspections_${date}.csv"`,
    },
  });
}
