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
  GripVertical,
  Pencil,
  Trash2,
  Camera,
  Info,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createChecklistItemSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { ChecklistItem } from "@/lib/types/helpers";

interface ChecklistItemEditorProps {
  templateId: string;
  templateVersion: number;
  items: ChecklistItem[];
}

export function ChecklistItemEditor({
  templateId,
  templateVersion,
  items,
}: ChecklistItemEditorProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [photoRequired, setPhotoRequired] = useState(false);

  // Gather unique categories for suggestions
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean))
  ) as string[];

  function resetForm() {
    setDescription("");
    setCategory("");
    setPhotoRequired(false);
  }

  async function incrementVersion() {
    const supabase = createBrowserSupabaseClient();
    await supabase
      .from("checklist_templates")
      .update({ version: templateVersion + 1 })
      .eq("id", templateId);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createChecklistItemSchema.safeParse({
      description,
      category: category || undefined,
      photo_required: photoRequired,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.from("checklist_items").insert({
      template_id: templateId,
      description,
      category: category || null,
      photo_required: photoRequired,
      display_order: items.length,
    });

    if (error) {
      setLoading(false);
      toast.error("Failed to add item");
      return;
    }

    await incrementVersion();
    setLoading(false);

    toast.success("Item added");
    resetForm();
    setAddOpen(false);
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;

    const parsed = createChecklistItemSchema.safeParse({
      description,
      category: category || undefined,
      photo_required: photoRequired,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("checklist_items")
      .update({
        description,
        category: category || null,
        photo_required: photoRequired,
      })
      .eq("id", editItem.id);

    if (error) {
      setLoading(false);
      toast.error("Failed to update item");
      return;
    }

    await incrementVersion();
    setLoading(false);

    toast.success("Item updated");
    setEditItem(null);
    resetForm();
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteItemId) return;
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("checklist_items")
      .delete()
      .eq("id", deleteItemId);

    if (error) {
      toast.error("Failed to delete item");
      setDeleteItemId(null);
      return;
    }

    await incrementVersion();
    toast.success("Item removed");
    setDeleteItemId(null);
    router.refresh();
  }

  // Group items by category
  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const key = item.category || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      {/* Version banner */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-info-border bg-info-bg px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p className="text-caption text-info">
          Editing items will create version {templateVersion + 1}. Existing
          inspection data is preserved with its original checklist snapshot.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm-body text-slate-500">
            No checklist items yet
          </p>
          <p className="mt-1 text-caption text-slate-400">
            Add items that inspectors will check during inspections
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupKeys.map((groupName) => (
            <div key={groupName}>
              <h3 className="text-label mb-2 uppercase text-slate-500">
                {groupName}
              </h3>
              <div className="space-y-1">
                {grouped[groupName].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                    <span className="w-6 shrink-0 text-center font-mono text-caption text-slate-400">
                      {item.display_order + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body text-slate-700">
                        {item.description}
                      </p>
                    </div>
                    {item.photo_required && (
                      <Camera className="h-4 w-4 shrink-0 text-warning" />
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditItem(item);
                          setDescription(item.description);
                          setCategory(item.category || "");
                          setPhotoRequired(item.photo_required);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDeleteItemId(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add item button + dialog */}
      <div className="mt-4">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Checklist Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm-body font-semibold text-slate-700">
                  Description
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Floors swept and mopped"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm-body font-semibold text-slate-700">
                  Category
                </Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Floors, Surfaces, Fixtures"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="photo-required"
                  checked={photoRequired}
                  onChange={(e) => setPhotoRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600"
                />
                <Label
                  htmlFor="photo-required"
                  className="text-sm-body text-slate-700"
                >
                  Photo required on fail
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddOpen(false);
                    resetForm();
                  }}
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
                  Add Item
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog
          open={!!editItem}
          onOpenChange={(open) => {
            if (!open) {
              setEditItem(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Checklist Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm-body font-semibold text-slate-700">
                  Description
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm-body font-semibold text-slate-700">
                  Category
                </Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Floors, Surfaces, Fixtures"
                  list="category-edit-suggestions"
                />
                <datalist id="category-edit-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="photo-required-edit"
                  checked={photoRequired}
                  onChange={(e) => setPhotoRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600"
                />
                <Label
                  htmlFor="photo-required-edit"
                  className="text-sm-body text-slate-700"
                >
                  Photo required on fail
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditItem(null);
                    resetForm();
                  }}
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
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete item confirmation */}
        <AlertDialog
          open={!!deleteItemId}
          onOpenChange={(open) => !open && setDeleteItemId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Checklist Item</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the item from the template and increment the
                version. Existing inspection data is not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-fail text-white hover:bg-fail/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
