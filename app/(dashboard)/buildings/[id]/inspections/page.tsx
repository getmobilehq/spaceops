import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import type { Building, UserProfile } from "@/lib/types/helpers";
import { getRecentInspections } from "@/lib/utils/dashboard-queries";
import { InspectionHistory } from "./inspection-history";

export default async function BuildingInspectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: buildingData } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", id)
    .single();

  const building = buildingData as unknown as Building | null;
  if (!building) notFound();

  // Get all space IDs for this building
  const { data: floorsData } = await supabase
    .from("floors")
    .select("id")
    .eq("building_id", id);

  const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);

  let spaceIds: string[] = [];
  if (floorIds.length > 0) {
    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);
    spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
  }

  // Fetch first page of inspections
  const initialInspections = await getRecentInspections(supabase, spaceIds, 20);

  return (
    <div className="p-4">
      <Link
        href={`/buildings/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm-body text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {building.name}
      </Link>

      <div className="mb-6 flex items-center gap-2">
        <History className="h-6 w-6 text-slate-400" />
        <h1 className="text-h1 text-slate-900">Inspection History</h1>
      </div>

      <InspectionHistory
        initialInspections={initialInspections}
        buildingId={id}
        userRole={profile.role}
        userId={profile.id}
      />
    </div>
  );
}
