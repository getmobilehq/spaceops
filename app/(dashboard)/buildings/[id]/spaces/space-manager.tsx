"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  QrCode,
  Filter,
  Upload,
  ClipboardList,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createSpaceSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { Floor, Space, SpaceType, ChecklistTemplate } from "@/lib/types/helpers";
import { SpaceQrDialog } from "./space-qr-dialog";
import { AssignChecklistDialog } from "./assign-checklist-dialog";
import { CsvImportDialog } from "./csv-import-dialog";
import { BatchPrintButton } from "./batch-print-button";

interface SpaceManagerProps {
  buildingId: string;
  floors: Floor[];
  spaces: Space[];
  spaceTypes: SpaceType[];
  templates: ChecklistTemplate[];
  isAdmin: boolean;
  deletedSpaces?: Space[];
}

export function SpaceManager({
  buildingId,
  floors,
  spaces,
  spaceTypes,
  templates,
  isAdmin,
  deletedSpaces = [],
}: SpaceManagerProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editSpace, setEditSpace] = useState<Space | null>(null);
  const [qrSpace, setQrSpace] = useState<Space | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "");
  const [spaceTypeId, setSpaceTypeId] = useState("");

  const filteredSpaces =
    filterFloor === "all"
      ? spaces
      : spaces.filter((s) => s.floor_id === filterFloor);

  const spaceTypeMap = Object.fromEntries(spaceTypes.map((t) => [t.id, t.name]));
  const floorMap = Object.fromEntries(floors.map((f) => [f.id, f.name]));

  function resetForm() {
    setName("");
    setFloorId(floors[0]?.id ?? "");
    setSpaceTypeId("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createSpaceSchema.safeParse({
      name,
      floor_id: floorId,
      space_type_id: spaceTypeId || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { data: spaceData, error } = await supabase
      .from("spaces")
      .insert({
        floor_id: floorId,
        name,
        space_type_id: spaceTypeId || null,
      })
      .select("id")
      .single();

    if (error) {
      setLoading(false);
      toast.error("Failed to create space");
      return;
    }

    // Auto-generate QR code for the space
    const spaceId = (spaceData as unknown as { id: string }).id;
    const encodedUrl = `${window.location.origin}/inspect/${spaceId}`;

    await supabase.from("qr_codes").insert({
      space_id: spaceId,
      encoded_url: encodedUrl,
    });

    setLoading(false);
    toast.success("Space created");
    resetForm();
    setAddOpen(false);
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSpace) return;

    const parsed = createSpaceSchema.safeParse({
      name,
      floor_id: floorId,
      space_type_id: spaceTypeId || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("spaces")
      .update({
        name,
        floor_id: floorId,
        space_type_id: spaceTypeId || null,
      })
      .eq("id", editSpace.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update space");
      return;
    }

    toast.success("Space updated");
    setEditSpace(null);
    resetForm();
    router.refresh();
  }

  async function handleDelete(spaceId: string) {
    const supabase = createBrowserSupabaseClient();

    // Soft delete
    const { error } = await supabase
      .from("spaces")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", spaceId);

    if (error) {
      toast.error("Failed to delete space");
      return;
    }

    toast.success("Space deleted");
    router.refresh();
  }

  async function handleRestore(spaceId: string) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("spaces")
      .update({ deleted_at: null })
      .eq("id", spaceId);

    if (error) {
      toast.error("Failed to restore space");
      return;
    }

    toast.success("Space restored");
    router.refresh();
  }

  return (
    <div>
      {/* Filter bar */}
      {floors.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={filterFloor} onValueChange={setFilterFloor}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All floors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All floors</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Space list */}
      {filteredSpaces.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm-body text-slate-500">
            {spaces.length === 0
              ? "No spaces added yet"
              : "No spaces on this floor"}
          </p>
          {isAdmin && spaces.length === 0 && (
            <p className="mt-1 text-caption text-slate-400">
              Add spaces to start inspecting
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSpaces.map((space) => (
            <div
              key={space.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-body font-medium text-slate-900">
                    {space.name}
                  </p>
                  {space.space_type_id && spaceTypeMap[space.space_type_id] && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      {spaceTypeMap[space.space_type_id]}
                    </span>
                  )}
                </div>
                <p className="text-caption text-slate-400">
                  {floorMap[space.floor_id] || "Unknown floor"}
                  {space.checklist_template_id ? "" : " · No checklist assigned"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQrSpace(space)}
                >
                  <QrCode className="h-4 w-4 text-slate-400" />
                </Button>

                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditSpace(space);
                          setName(space.name);
                          setFloorId(space.floor_id);
                          setSpaceTypeId(space.space_type_id || "");
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-fail"
                        onClick={() => handleDelete(space.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {isAdmin && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Space
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Space</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm-body font-semibold text-slate-700">
                    Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Room 101, Conference Room A"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm-body font-semibold text-slate-700">
                    Floor
                  </Label>
                  <Select value={floorId} onValueChange={setFloorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent>
                      {floors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm-body font-semibold text-slate-700">
                    Space Type
                  </Label>
                  <Select
                    value={spaceTypeId}
                    onValueChange={setSpaceTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {spaceTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    Add Space
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit dialog */}
          <Dialog
            open={!!editSpace}
            onOpenChange={(open) => {
              if (!open) {
                setEditSpace(null);
                resetForm();
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Space</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm-body font-semibold text-slate-700">
                    Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm-body font-semibold text-slate-700">
                    Floor
                  </Label>
                  <Select value={floorId} onValueChange={setFloorId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {floors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm-body font-semibold text-slate-700">
                    Space Type
                  </Label>
                  <Select
                    value={spaceTypeId}
                    onValueChange={setSpaceTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {spaceTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditSpace(null);
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvOpen(true)}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Import CSV
          </Button>

          {templates.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignOpen(true)}
            >
              <ClipboardList className="mr-1.5 h-4 w-4" />
              Assign Checklist
            </Button>
          )}

          <BatchPrintButton
            buildingId={buildingId}
            spaceCount={spaces.length}
          />
        </div>
      )}

      {/* Show deleted spaces toggle */}
      {isAdmin && deletedSpaces.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="flex items-center gap-1.5 text-caption text-slate-400 hover:text-slate-600"
          >
            <Trash2 className="h-3 w-3" />
            {showDeleted ? "Hide" : "Show"} {deletedSpaces.length} deleted
          </button>

          {showDeleted && (
            <div className="mt-3 space-y-2">
              {deletedSpaces.map((space) => (
                <div
                  key={space.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 opacity-60"
                >
                  <div>
                    <p className="text-body font-medium text-slate-500 line-through">
                      {space.name}
                    </p>
                    <p className="text-caption text-slate-400">
                      Deleted {space.deleted_at ? new Date(space.deleted_at).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(space.id)}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Code dialog */}
      <SpaceQrDialog
        space={qrSpace}
        buildingName=""
        floorName={qrSpace ? floorMap[qrSpace.floor_id] || "" : ""}
        onClose={() => setQrSpace(null)}
      />

      {/* Assign checklist dialog */}
      <AssignChecklistDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        templates={templates}
        spaces={spaces}
        floors={floors}
        spaceTypes={spaceTypes}
      />

      {/* CSV import dialog */}
      <CsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        floors={floors}
        spaceTypes={spaceTypes}
      />
    </div>
  );
}
