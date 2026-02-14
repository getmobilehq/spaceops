"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Loader2, ClipboardList } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { ChecklistTemplate, Space, Floor, SpaceType } from "@/lib/types/helpers";

interface AssignChecklistDialogProps {
  open: boolean;
  onClose: () => void;
  templates: ChecklistTemplate[];
  spaces: Space[];
  floors: Floor[];
  spaceTypes: SpaceType[];
}

type AssignMode = "individual" | "floor" | "type";

export function AssignChecklistDialog({
  open,
  onClose,
  templates,
  spaces,
  floors,
  spaceTypes,
}: AssignChecklistDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [mode, setMode] = useState<AssignMode>("floor");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("");

  function getTargetSpaceIds(): string[] {
    switch (mode) {
      case "individual":
        return selectedSpace ? [selectedSpace] : [];
      case "floor":
        return spaces
          .filter((s) => s.floor_id === selectedFloor)
          .map((s) => s.id);
      case "type":
        return spaces
          .filter((s) => s.space_type_id === selectedType)
          .map((s) => s.id);
      default:
        return [];
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();

    if (!templateId) {
      toast.error("Please select a checklist template");
      return;
    }

    const targetIds = getTargetSpaceIds();
    if (targetIds.length === 0) {
      toast.error("No spaces selected");
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    // Update all target spaces
    const { error } = await supabase
      .from("spaces")
      .update({ checklist_template_id: templateId })
      .in("id", targetIds);

    setLoading(false);

    if (error) {
      toast.error("Failed to assign checklist");
      return;
    }

    toast.success(
      `Checklist assigned to ${targetIds.length} space${targetIds.length !== 1 ? "s" : ""}`
    );
    onClose();
    router.refresh();
  }

  const targetCount = getTargetSpaceIds().length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Checklist</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAssign} className="space-y-4">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <ClipboardList className="h-8 w-8 text-slate-400" />
              <div>
                <p className="text-body font-semibold text-slate-700">
                  No checklist templates found
                </p>
                <p className="mt-1 text-caption text-slate-500">
                  Create a checklist template first, then assign it to spaces.
                </p>
              </div>
              <a
                href="/admin/checklists"
                className="text-caption font-semibold text-primary-600 hover:text-primary-700"
              >
                Create Template &rarr;
              </a>
            </div>
          ) : (
          <div className="space-y-2">
            <Label className="text-sm-body font-semibold text-slate-700">
              Checklist Template
            </Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm-body font-semibold text-slate-700">
              Assign To
            </Label>
            <div className="flex gap-2">
              {(
                [
                  { value: "individual", label: "Space" },
                  { value: "floor", label: "Floor" },
                  { value: "type", label: "Type" },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={mode === opt.value ? "default" : "outline"}
                  size="sm"
                  className={
                    mode === opt.value
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : ""
                  }
                  onClick={() => setMode(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {mode === "individual" && (
            <div className="space-y-2">
              <Label className="text-sm-body font-semibold text-slate-700">
                Space
              </Label>
              <Select value={selectedSpace} onValueChange={setSelectedSpace}>
                <SelectTrigger>
                  <SelectValue placeholder="Select space" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "floor" && (
            <div className="space-y-2">
              <Label className="text-sm-body font-semibold text-slate-700">
                Floor
              </Label>
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
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
          )}

          {mode === "type" && (
            <div className="space-y-2">
              <Label className="text-sm-body font-semibold text-slate-700">
                Space Type
              </Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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
          )}

          {targetCount > 0 && (
            <p className="text-caption text-slate-500">
              Will assign to {targetCount} space
              {targetCount !== 1 ? "s" : ""}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !templateId || targetCount === 0}
              className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
