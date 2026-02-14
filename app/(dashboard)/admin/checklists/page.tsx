import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  UserProfile,
  ChecklistTemplate,
  ChecklistItem,
} from "@/lib/types/helpers";
import { ChecklistManager } from "./checklist-manager";

export default async function AdminChecklistsPage() {
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
  if (!profile || profile.role !== "admin") redirect("/");

  // Get org-specific templates (active + archived in parallel)
  const [
    { data: orgTemplatesData },
    { data: archivedTemplatesData },
    { data: cannedTemplatesData },
  ] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("*")
      .eq("org_id", profile.org_id)
      .eq("archived", false)
      .order("name"),
    supabase
      .from("checklist_templates")
      .select("*")
      .eq("org_id", profile.org_id)
      .eq("archived", true)
      .order("name"),
    supabase
      .from("checklist_templates")
      .select("*")
      .is("org_id", null)
      .eq("is_canned", true)
      .order("name"),
  ]);

  const orgTemplates = (orgTemplatesData ?? []) as unknown as ChecklistTemplate[];
  const archivedTemplates = (archivedTemplatesData ?? []) as unknown as ChecklistTemplate[];
  const cannedTemplates = (cannedTemplatesData ?? []) as unknown as ChecklistTemplate[];

  // Get all items for all templates (org + archived + canned)
  const allTemplateIds = [
    ...orgTemplates.map((t) => t.id),
    ...archivedTemplates.map((t) => t.id),
    ...cannedTemplates.map((t) => t.id),
  ];

  let items: ChecklistItem[] = [];
  if (allTemplateIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("checklist_items")
      .select("*")
      .in("template_id", allTemplateIds)
      .order("display_order");

    items = (itemsData ?? []) as unknown as ChecklistItem[];
  }

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">Checklists</h1>
        <p className="mt-1 text-sm-body text-slate-500">
          Create and manage inspection checklist templates
        </p>
      </div>

      <ChecklistManager
        orgId={profile.org_id}
        orgTemplates={orgTemplates}
        archivedTemplates={archivedTemplates}
        cannedTemplates={cannedTemplates}
        items={items}
      />
    </div>
  );
}
