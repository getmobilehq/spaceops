import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type {
  Space,
  Floor,
  Building,
  UserProfile,
  ChecklistTemplate,
  ChecklistItem,
  Inspection,
  InspectionResponse,
} from "@/lib/types/helpers";
import { ChecklistForm } from "./checklist-form";

export default async function InspectionChecklistPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { spaceId } = await params;
  const { edit: editInspectionId } = await searchParams;
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

  // Get space
  const { data: spaceData } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", spaceId)
    .is("deleted_at", null)
    .single();

  const space = spaceData as unknown as Space | null;
  if (!space) notFound();
  if (!space.checklist_template_id) redirect(`/inspect/${spaceId}`);

  // Get floor & building for context
  const { data: floorData } = await supabase
    .from("floors")
    .select("*")
    .eq("id", space.floor_id)
    .single();

  const floor = floorData as unknown as Floor | null;

  let building: Building | null = null;
  if (floor) {
    const { data: buildingData } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", floor.building_id)
      .single();
    building = buildingData as unknown as Building | null;
  }

  // Get template and items
  const { data: templateData } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", space.checklist_template_id)
    .single();

  const template = templateData as unknown as ChecklistTemplate | null;
  if (!template) redirect(`/inspect/${spaceId}`);

  const { data: itemsData } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("template_id", template.id)
    .order("display_order");

  const items = (itemsData ?? []) as unknown as ChecklistItem[];

  // EDIT MODE: Load existing inspection and responses
  if (editInspectionId) {
    const { data: editInspectionData } = await supabase
      .from("inspections")
      .select("*")
      .eq("id", editInspectionId)
      .eq("space_id", spaceId)
      .eq("status", "completed")
      .single();

    const editInspection = editInspectionData as unknown as Inspection | null;
    if (!editInspection) redirect(`/inspect/${spaceId}`);

    // Validate 3-month window
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (new Date(editInspection.completed_at!) < threeMonthsAgo) {
      redirect(`/inspect/${spaceId}`);
    }

    // Validate user is admin or original inspector
    if (profile.role !== "admin" && editInspection.inspector_id !== user.id) {
      redirect(`/inspect/${spaceId}`);
    }

    // Load existing responses
    const { data: responsesData } = await supabase
      .from("inspection_responses")
      .select("*")
      .eq("inspection_id", editInspectionId);

    const existingResponses = (responsesData ?? []) as unknown as InspectionResponse[];

    return (
      <ChecklistForm
        inspection={editInspection}
        space={space}
        template={template}
        items={items}
        floorName={floor?.name || ""}
        buildingName={building?.name || ""}
        buildingId={building?.id || ""}
        orgId={profile.org_id}
        userId={profile.id}
        editMode={true}
        existingResponses={existingResponses}
      />
    );
  }

  // NEW INSPECTION MODE
  // Check for existing in-progress inspection or create new one
  const { data: activeData } = await supabase
    .from("inspections")
    .select("*")
    .eq("space_id", spaceId)
    .eq("inspector_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  let inspection = activeData as unknown as Inspection | null;

  if (!inspection) {
    const { data: newInspection, error } = await supabase
      .from("inspections")
      .insert({
        space_id: spaceId,
        inspector_id: user.id,
        template_version: template.version,
      })
      .select("*")
      .single();

    if (error || !newInspection) {
      throw new Error("Failed to create inspection");
    }

    inspection = newInspection as unknown as Inspection;
  }

  return (
    <ChecklistForm
      inspection={inspection}
      space={space}
      template={template}
      items={items}
      floorName={floor?.name || ""}
      buildingName={building?.name || ""}
      buildingId={building?.id || ""}
      orgId={profile.org_id}
      userId={profile.id}
    />
  );
}
