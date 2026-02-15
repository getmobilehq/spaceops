import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { exportDeficienciesSchema } from "@/lib/validators/schemas";
import { toCsvString } from "@/lib/utils/csv";
import type { Deficiency } from "@/lib/types/helpers";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = exportDeficienciesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const filters = parsed.data;

  let query = supabase.from("deficiencies").select("*").order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  const { data: defData } = await query.limit(5000);
  const deficiencies = (defData ?? []) as unknown as Deficiency[];

  // Filter by building
  let filtered = deficiencies;
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
      filtered = deficiencies.filter((d) => spaceIds.has(d.space_id));
    } else {
      filtered = [];
    }
  }

  // Enrich with space/building names
  const spaceIds = [...new Set(filtered.map((d) => d.space_id))];
  let spaceNameMap: Record<string, string> = {};
  let buildingNameBySpace: Record<string, string> = {};

  if (spaceIds.length > 0) {
    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id, name, floor_id")
      .in("id", spaceIds);

    const spaces = (spacesData ?? []) as unknown as { id: string; name: string; floor_id: string }[];
    spaceNameMap = Object.fromEntries(spaces.map((s) => [s.id, s.name]));

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
  }

  const headers = ["Deficiency Number", "Status", "Space", "Building", "Created At", "Resolved At"];
  const rows = filtered.map((d) => [
    d.deficiency_number,
    d.status,
    spaceNameMap[d.space_id] ?? "",
    buildingNameBySpace[d.space_id] ?? "",
    new Date(d.created_at).toISOString(),
    d.resolved_at ? new Date(d.resolved_at).toISOString() : "",
  ]);

  const csv = toCsvString(headers, rows);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spaceops_deficiencies_${date}.csv"`,
    },
  });
}
