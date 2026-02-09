import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import Link from "next/link";
import type { Building, Floor, Space, SpaceType, UserProfile, ChecklistTemplate } from "@/lib/types/helpers";
import { SpaceManager } from "./space-manager";

export default async function BuildingSpacesPage({
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

  const { data: floorsData } = await supabase
    .from("floors")
    .select("*")
    .eq("building_id", id)
    .order("display_order");

  const floors = (floorsData ?? []) as unknown as Floor[];

  const { data: spacesData } = await supabase
    .from("spaces")
    .select("*")
    .in(
      "floor_id",
      floors.map((f) => f.id)
    )
    .is("deleted_at", null)
    .order("name");

  const spaces = (spacesData ?? []) as unknown as Space[];

  // Fetch soft-deleted spaces for admin recovery
  let deletedSpaces: Space[] = [];
  if (profile.role === "admin" && floors.length > 0) {
    const { data: deletedData } = await supabase
      .from("spaces")
      .select("*")
      .in("floor_id", floors.map((f) => f.id))
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    deletedSpaces = (deletedData ?? []) as unknown as Space[];
  }

  // Get space types (default + org-specific)
  const { data: spaceTypesData } = await supabase
    .from("space_types")
    .select("*")
    .or(`is_default.eq.true,org_id.eq.${profile.org_id}`)
    .order("name");

  const spaceTypes = (spaceTypesData ?? []) as unknown as SpaceType[];

  // Get checklist templates (org-specific)
  const { data: templatesData } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("org_id", profile.org_id)
    .eq("archived", false)
    .order("name");

  const templates = (templatesData ?? []) as unknown as ChecklistTemplate[];

  return (
    <div className="p-4">
      <Link
        href={`/buildings/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm-body text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {building.name}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-slate-400" />
          <h1 className="text-h1 text-slate-900">Spaces</h1>
        </div>
        <p className="mt-1 text-sm-body text-slate-500">
          {spaces.length} space{spaces.length !== 1 ? "s" : ""} across{" "}
          {floors.length} floor{floors.length !== 1 ? "s" : ""}
        </p>
      </div>

      <SpaceManager
        buildingId={building.id}
        floors={floors}
        spaces={spaces}
        spaceTypes={spaceTypes}
        templates={templates}
        isAdmin={profile.role === "admin"}
        deletedSpaces={deletedSpaces}
      />
    </div>
  );
}
