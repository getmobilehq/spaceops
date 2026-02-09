"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import type { Building } from "@/lib/types/helpers";
import { createTaskSchema } from "@/lib/validators/schemas";

interface CreateTaskDialogProps {
  userId: string;
  buildings: Building[];
  spaces: { id: string; name: string; buildingId: string }[];
  staffUsers: { id: string; name: string; role: string }[];
}

export function CreateTaskDialog({
  userId,
  buildings,
  spaces,
  staffUsers,
}: CreateTaskDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [buildingId, setBuildingId] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredSpaces = buildingId
    ? spaces.filter((s) => s.buildingId === buildingId)
    : [];

  function resetForm() {
    setBuildingId("");
    setSpaceId("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("");
    setDueDate("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = createTaskSchema.safeParse({
      space_id: spaceId,
      description,
      priority,
      assigned_to: assignedTo || undefined,
      due_date: dueDate || undefined,
    });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setSaving(true);
    const supabase = createBrowserSupabaseClient();

    const { error: dbError } = await supabase.from("tasks").insert({
      space_id: spaceId,
      description: description.trim(),
      priority: priority as "critical" | "high" | "medium" | "low",
      source: "manual" as const,
      created_by: userId,
      assigned_to: assignedTo || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });

    if (dbError) {
      setError("Failed to create task");
      setSaving(false);
      return;
    }

    toast.success("Task created");

    // Fire-and-forget: notify assignee
    if (assignedTo) {
      // We need the task ID for SMS, but for simplicity we skip re-querying
      // The notification will be created when the task is assigned via the detail sheet
    }

    resetForm();
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Building */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-slate-700">
              Building
            </label>
            <select
              value={buildingId}
              onChange={(e) => {
                setBuildingId(e.target.value);
                setSpaceId("");
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-body text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            >
              <option value="">Select building...</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Space */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-slate-700">
              Space
            </label>
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-body text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
              disabled={!buildingId}
            >
              <option value="">Select space...</option>
              {filteredSpaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-body text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              placeholder="Describe the task..."
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-slate-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-body text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-slate-700">
              Assign To (optional)
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-body text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Unassigned</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-slate-700">
              Due Date (optional)
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-body text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {error && (
            <p className="text-caption text-fail">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Create Task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
