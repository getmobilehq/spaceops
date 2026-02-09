"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  ClipboardList,
  ChevronRight,
  Copy,
  Library,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createChecklistTemplateSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { ChecklistTemplate, ChecklistItem } from "@/lib/types/helpers";
import Link from "next/link";

interface ChecklistManagerProps {
  orgId: string;
  orgTemplates: ChecklistTemplate[];
  cannedTemplates: ChecklistTemplate[];
  items: ChecklistItem[];
}

export function ChecklistManager({
  orgId,
  orgTemplates,
  cannedTemplates,
  items,
}: ChecklistManagerProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const itemsByTemplate = items.reduce<Record<string, ChecklistItem[]>>(
    (acc, item) => {
      if (!acc[item.template_id]) acc[item.template_id] = [];
      acc[item.template_id].push(item);
      return acc;
    },
    {}
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createChecklistTemplateSchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.from("checklist_templates").insert({
      org_id: orgId,
      name,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create template");
      return;
    }

    toast.success("Template created");
    setName("");
    setCreateOpen(false);
    router.refresh();
  }

  async function handleClone(template: ChecklistTemplate) {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    // Create new template
    const { data: newTemplate, error: templateError } = await supabase
      .from("checklist_templates")
      .insert({
        org_id: orgId,
        name: `${template.name} (Copy)`,
      })
      .select("id")
      .single();

    if (templateError || !newTemplate) {
      setLoading(false);
      toast.error("Failed to clone template");
      return;
    }

    const newTemplateId = (newTemplate as unknown as { id: string }).id;

    // Clone items
    const templateItems = itemsByTemplate[template.id] || [];
    if (templateItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("checklist_items")
        .insert(
          templateItems.map((item, index) => ({
            template_id: newTemplateId,
            description: item.description,
            category: item.category,
            photo_required: item.photo_required,
            display_order: index,
          }))
        );

      if (itemsError) {
        setLoading(false);
        toast.error("Template created but failed to clone items");
        router.refresh();
        return;
      }
    }

    setLoading(false);
    toast.success("Template cloned successfully");
    setCloneOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Org templates */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h3 font-semibold text-slate-700">
            Your Templates
          </h2>
          <div className="flex gap-2">
            <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Library className="mr-1.5 h-4 w-4" />
                  From Library
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Clone from Library</DialogTitle>
                </DialogHeader>
                <p className="text-sm-body text-slate-500 mb-3">
                  Select a system template to clone and customize
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {cannedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-body font-medium text-slate-900">
                          {template.name}
                        </p>
                        <p className="text-caption text-slate-500">
                          {(itemsByTemplate[template.id] || []).length} items
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleClone(template)}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Clone
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                  {cannedTemplates.length === 0 && (
                    <p className="text-sm-body text-slate-400 text-center py-4">
                      No system templates available
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>New Checklist Template</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm-body font-semibold text-slate-700">
                      Template Name
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Restroom Deep Clean"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {orgTemplates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm-body text-slate-500">
              No custom templates yet
            </p>
            <p className="mt-1 text-caption text-slate-400">
              Create one from scratch or clone from the library
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {orgTemplates.map((template) => (
              <Link
                key={template.id}
                href={`/admin/checklists/${template.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-body font-medium text-slate-900">
                      {template.name}
                    </p>
                    <p className="text-caption text-slate-500">
                      {(itemsByTemplate[template.id] || []).length} items · v
                      {template.version}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* System templates (read-only) */}
      {cannedTemplates.length > 0 && (
        <section>
          <h2 className="text-h3 mb-3 font-semibold text-slate-700">
            System Library
          </h2>
          <div className="space-y-2">
            {cannedTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Library className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-body font-medium text-slate-700">
                      {template.name}
                    </p>
                    <p className="text-caption text-slate-400">
                      {(itemsByTemplate[template.id] || []).length} items ·
                      System template
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => handleClone(template)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Clone
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
