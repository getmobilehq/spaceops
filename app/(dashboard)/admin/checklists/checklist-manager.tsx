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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Loader2,
  ClipboardList,
  ChevronRight,
  Copy,
  Library,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createChecklistTemplateSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { ChecklistTemplate, ChecklistItem } from "@/lib/types/helpers";
import Link from "next/link";

interface ChecklistManagerProps {
  orgId: string;
  orgTemplates: ChecklistTemplate[];
  archivedTemplates: ChecklistTemplate[];
  cannedTemplates: ChecklistTemplate[];
  items: ChecklistItem[];
}

export function ChecklistManager({
  orgId,
  orgTemplates,
  archivedTemplates,
  cannedTemplates,
  items,
}: ChecklistManagerProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ChecklistTemplate | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [renameName, setRenameName] = useState("");
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

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;

    const parsed = createChecklistTemplateSchema.safeParse({ name: renameName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("checklist_templates")
      .update({ name: renameName })
      .eq("id", renameTarget.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to rename template");
      return;
    }

    toast.success("Template renamed");
    setRenameOpen(false);
    setRenameTarget(null);
    setRenameName("");
    router.refresh();
  }

  async function handleArchive(template: ChecklistTemplate) {
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("checklist_templates")
      .update({ archived: true })
      .eq("id", template.id);

    if (error) {
      toast.error("Failed to archive template");
      return;
    }

    toast.success(`"${template.name}" archived`);
    router.refresh();
  }

  async function handleRestore(template: ChecklistTemplate) {
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("checklist_templates")
      .update({ archived: false })
      .eq("id", template.id);

    if (error) {
      toast.error("Failed to restore template");
      return;
    }

    toast.success(`"${template.name}" restored`);
    router.refresh();
  }

  function openRename(template: ChecklistTemplate) {
    setRenameTarget(template);
    setRenameName(template.name);
    setRenameOpen(true);
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
              <div
                key={template.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <Link
                  href={`/admin/checklists/${template.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:opacity-80"
                >
                  <ClipboardList className="h-5 w-5 shrink-0 text-primary-500" />
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-slate-900">
                      {template.name}
                    </p>
                    <p className="text-caption text-slate-500">
                      {(itemsByTemplate[template.id] || []).length} items · v
                      {template.version}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openRename(template)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleClone(template)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleArchive(template)}
                        className="text-fail focus:text-fail"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link href={`/admin/checklists/${template.id}`}>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Archived templates */}
      {archivedTemplates.length > 0 && (
        <section>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-caption font-semibold text-slate-500 hover:text-slate-700"
          >
            {showArchived ? "Hide" : "Show"} {archivedTemplates.length} archived
            template{archivedTemplates.length !== 1 ? "s" : ""}
          </button>

          {showArchived && (
            <div className="mt-2 space-y-2">
              {archivedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-body font-medium text-slate-500 line-through">
                        {template.name}
                      </p>
                      <p className="text-caption text-slate-400">
                        {(itemsByTemplate[template.id] || []).length} items · v
                        {template.version} · Archived
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(template)}
                  >
                    <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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

      {/* Rename dialog */}
      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRenameOpen(false);
            setRenameTarget(null);
            setRenameName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm-body font-semibold text-slate-700">
                Template Name
              </Label>
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Enter new name"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenameOpen(false);
                  setRenameTarget(null);
                  setRenameName("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !renameName.trim()}
                className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
              >
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Rename
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
