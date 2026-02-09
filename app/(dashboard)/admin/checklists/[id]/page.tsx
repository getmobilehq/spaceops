import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type {
  UserProfile,
  ChecklistTemplate,
  ChecklistItem,
} from "@/lib/types/helpers";
import { ChecklistItemEditor } from "./checklist-item-editor";

export default async function ChecklistDetailPage({
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
  if (!profile || profile.role !== "admin") redirect("/");

  const { data: templateData } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", id)
    .single();

  const template = templateData as unknown as ChecklistTemplate | null;
  if (!template) notFound();

  // Only allow editing org templates
  if (template.org_id !== profile.org_id) redirect("/admin/checklists");

  const { data: itemsData } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("template_id", id)
    .order("display_order");

  const items = (itemsData ?? []) as unknown as ChecklistItem[];

  return (
    <div className="p-4">
      <Link
        href="/admin/checklists"
        className="mb-4 inline-flex items-center gap-1 text-sm-body text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Checklists
      </Link>

      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">{template.name}</h1>
        <p className="mt-1 text-caption text-slate-500">
          Version {template.version} · {items.length} item
          {items.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ChecklistItemEditor templateId={template.id} templateVersion={template.version} items={items} />
    </div>
  );
}
