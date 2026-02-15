import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  Deficiency,
  Space,
  Building,
  Floor,
  UserProfile,
} from "@/lib/types/helpers";
import { DeficiencyList } from "./deficiency-list";
import { ExportButton } from "@/components/shared/export-button";

export default async function DeficienciesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as unknown as UserProfile | null;
  if (!profile) redirect("/login");

  // Fetch deficiencies
  const { data: defData } = await supabase
    .from("deficiencies")
    .select("*")
    .order("created_at", { ascending: false });

  const deficiencies = (defData ?? []) as unknown as Deficiency[];

  // Fetch spaces for deficiency context
  const spaceIds = [...new Set(deficiencies.map((d) => d.space_id))];
  let spaces: Space[] = [];
  if (spaceIds.length > 0) {
    const { data: spacesData } = await supabase
      .from("spaces")
      .select("*")
      .in("id", spaceIds);
    spaces = (spacesData ?? []) as unknown as Space[];
  }

  // Fetch floors for building context
  const floorIds = [...new Set(spaces.map((s) => s.floor_id))];
  let floors: Floor[] = [];
  if (floorIds.length > 0) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("*")
      .in("id", floorIds);
    floors = (floorsData ?? []) as unknown as Floor[];
  }

  // Fetch buildings
  const buildingIds = [...new Set(floors.map((f) => f.building_id))];
  let buildings: Building[] = [];
  if (buildingIds.length > 0) {
    const { data: buildingsData } = await supabase
      .from("buildings")
      .select("*")
      .in("id", buildingIds);
    buildings = (buildingsData ?? []) as unknown as Building[];
  }

  // Build lookup maps
  const spaceMap = Object.fromEntries(spaces.map((s) => [s.id, s]));
  const floorMap = Object.fromEntries(floors.map((f) => [f.id, f]));
  const buildingMap = Object.fromEntries(buildings.map((b) => [b.id, b]));

  // Enrich deficiencies with context
  const enriched = deficiencies.map((def) => {
    const space = spaceMap[def.space_id];
    const floor = space ? floorMap[space.floor_id] : undefined;
    const building = floor ? buildingMap[floor.building_id] : undefined;
    return {
      ...def,
      spaceName: space?.name ?? "Unknown",
      buildingName: building?.name ?? "Unknown",
      buildingId: building?.id ?? "",
    };
  });

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1 text-slate-900">Deficiencies</h1>
        <ExportButton exportType="deficiencies" />
      </div>
      <DeficiencyList
        deficiencies={enriched}
        buildings={buildings}
      />
    </div>
  );
}
