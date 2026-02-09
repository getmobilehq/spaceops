"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, GripVertical, Pencil, Trash2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createFloorSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { Floor } from "@/lib/types/helpers";

interface FloorManagerProps {
  buildingId: string;
  floors: Floor[];
  isAdmin: boolean;
}

export function FloorManager({
  buildingId,
  floors,
  isAdmin,
}: FloorManagerProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editFloor, setEditFloor] = useState<Floor | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createFloorSchema.safeParse({
      name,
      display_order: floors.length,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.from("floors").insert({
      building_id: buildingId,
      name,
      display_order: floors.length,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A floor with this name already exists");
      } else {
        toast.error("Failed to add floor");
      }
      return;
    }

    toast.success("Floor added");
    setName("");
    setAddOpen(false);
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editFloor) return;

    const parsed = createFloorSchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("floors")
      .update({ name })
      .eq("id", editFloor.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update floor");
      return;
    }

    toast.success("Floor updated");
    setEditFloor(null);
    setName("");
    router.refresh();
  }

  async function handleDelete(floorId: string) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("floors").delete().eq("id", floorId);

    if (error) {
      toast.error("Failed to delete floor. Remove all spaces first.");
      return;
    }

    toast.success("Floor deleted");
    router.refresh();
  }

  return (
    <div>
      {floors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm-body text-slate-500">No floors added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {floors.map((floor, index) => (
            <div
              key={floor.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-slate-300" />
                <span className="text-body text-slate-700">{floor.name}</span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditFloor(floor);
                      setName(floor.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(floor.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="mt-3">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Floor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Floor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm-body font-semibold text-slate-700">
                    Floor Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Floor 1, Basement, Mezzanine"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddOpen(false)}
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
                    Add Floor
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!editFloor}
            onOpenChange={(open) => {
              if (!open) {
                setEditFloor(null);
                setName("");
              }
            }}
          >
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Edit Floor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm-body font-semibold text-slate-700">
                    Floor Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditFloor(null)}
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
        </div>
      )}
    </div>
  );
}
