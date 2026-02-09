import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import type { Building, UserProfile, BuildingAssignment } from "@/lib/types/helpers";
import { CreateBuildingDialog } from "./create-building-dialog";
import { formatSqft } from "@/lib/utils/format";
import { BuildingListClient } from "./building-list-client";

export default async function BuildingsPage() {
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

  // Fetch active buildings
  const { data: activeBuildingsData } = await supabase
    .from("buildings")
    .select("*")
    .eq("archived", false)
    .order("name");

  const activeBuildings = (activeBuildingsData ?? []) as unknown as Building[];

  // Fetch archived buildings for admin
  let archivedBuildings: Building[] = [];
  if (profile.role === "admin") {
    const { data: archivedData } = await supabase
      .from("buildings")
      .select("*")
      .eq("archived", true)
      .order("name");

    archivedBuildings = (archivedData ?? []) as unknown as Building[];
  }

  // For supervisors/staff: filter to assigned buildings
  let assignedBuildingIds: string[] | null = null;
  if (profile.role === "supervisor" || profile.role === "staff") {
    const { data: assignmentsData } = await supabase
      .from("building_assignments")
      .select("*")
      .eq("user_id", user.id);

    const assignments = (assignmentsData ?? []) as unknown as BuildingAssignment[];
    assignedBuildingIds = assignments.map((a) => a.building_id);
  }

  // Filter buildings for supervisor/staff
  const visibleBuildings = assignedBuildingIds
    ? activeBuildings.filter((b) => assignedBuildingIds!.includes(b.id))
    : activeBuildings;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-h1 text-slate-900">Buildings</h1>
          {assignedBuildingIds !== null && (
            <span className="rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-info">
              {visibleBuildings.length} assigned
            </span>
          )}
        </div>
        {profile.role === "admin" && <CreateBuildingDialog orgId={profile.org_id} />}
      </div>

      <BuildingListClient
        buildings={visibleBuildings}
        archivedBuildings={archivedBuildings}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
