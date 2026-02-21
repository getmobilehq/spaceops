"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import {
  Loader2,
  MapPin,
  User,
  Clock,
  Calendar,
  Link2,
  AlertTriangle,
  Zap,
  Copy,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import type { TaskPriority, TaskStatus } from "@/lib/types/database";
import type { EnrichedTask } from "./page";
import Link from "next/link";

interface TaskDetailSheetProps {
  task: EnrichedTask | null | undefined;
  open: boolean;
  onClose: () => void;
  staffUsers: { id: string; name: string; role: string }[];
  isAdmin: boolean;
}

export function TaskDetailSheet({
  task,
  open,
  onClose,
  staffUsers,
  isAdmin,
}: TaskDetailSheetProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [resolutionComment, setResolutionComment] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync local state when task changes
  const taskId = task?.id;
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);
  if (taskId && taskId !== lastTaskId) {
    setLastTaskId(taskId);
    setAssignedTo(task.assigned_to ?? "");
    setPriority(task.priority);
    setDueDate(
      task.due_date
        ? new Date(task.due_date).toISOString().slice(0, 16)
        : ""
    );
    setResolutionComment(task.resolution_comment ?? "");
    setShowResolveForm(false);
    setEditingDescription(false);
    setShowDeleteConfirm(false);
  }

  if (!task) return null;

  const isOverdue =
    task.due_date &&
    task.status !== "closed" &&
    new Date(task.due_date).getTime() < Date.now();

  async function handleAssign(userId: string) {
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: userId || null })
      .eq("id", task!.id);

    if (error) {
      toast.error("Failed to update assignment");
    } else {
      toast.success("Assignment updated");
      setAssignedTo(userId);

      // Fire-and-forget: send SMS + in-app notification
      if (userId) {
        fetch("/api/notifications/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: task!.id,
            type: "task_assigned",
            assigned_to: userId,
          }),
        }).catch(() => {});
      }

      router.refresh();
    }
    setSaving(false);
  }

  async function handleUpdatePriorityDueDate() {
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const updates: Record<string, unknown> = {
      priority: priority,
    };
    if (dueDate) {
      updates.due_date = new Date(dueDate).toISOString();
    } else {
      updates.due_date = null;
    }

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task!.id);

    if (error) {
      toast.error("Failed to update task");
    } else {
      toast.success("Task updated");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleStatusChange(newStatus: TaskStatus) {
    if (newStatus === "closed") {
      setShowResolveForm(true);
      return;
    }

    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task!.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Task marked as ${newStatus.replace("_", " ")}`);
      router.refresh();
      onClose();
    }
    setSaving(false);
  }

  async function handleClose() {
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const updates: Record<string, unknown> = {
      status: "closed",
      resolved_at: new Date().toISOString(),
    };
    if (resolutionComment.trim()) {
      updates.resolution_comment = resolutionComment.trim();
    }

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task!.id);

    if (error) {
      toast.error("Failed to close task");
    } else {
      toast.success("Task closed");
      router.refresh();
      onClose();
    }
    setSaving(false);
  }

  async function handleDuplicate() {
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("tasks").insert({
      space_id: task!.space_id,
      description: task!.description,
      priority: task!.priority as TaskPriority,
      status: "open" as TaskStatus,
      source: "manual" as const,
      created_by: task!.created_by,
      deficiency_id: task!.deficiency_id,
    });

    if (error) {
      toast.error("Failed to duplicate task");
    } else {
      toast.success("Task duplicated");
      router.refresh();
      onClose();
    }
    setSaving(false);
  }

  async function handleUpdateDescription() {
    if (!editDescription.trim()) {
      toast.error("Description cannot be empty");
      return;
    }

    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("tasks")
      .update({ description: editDescription.trim() })
      .eq("id", task!.id);

    if (error) {
      toast.error("Failed to update description");
    } else {
      toast.success("Description updated");
      setEditingDescription(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task!.id);

    if (error) {
      toast.error("Failed to delete task");
    } else {
      toast.success("Task deleted");
      setShowDeleteConfirm(false);
      router.refresh();
      onClose();
    }
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority as TaskPriority} />
            <StatusBadge status={task.status} />
            {task.source === "auto" && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                Auto
              </span>
            )}
            {task.isRecurring && (
              <span className="flex items-center gap-0.5 rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                <Zap className="h-2.5 w-2.5" />
                Recurring ({task.recurrenceCount}x)
              </span>
            )}
          </div>
          {editingDescription ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="flex-1 text-h3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateDescription();
                  if (e.key === "Escape") setEditingDescription(false);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleUpdateDescription}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 text-pass" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditingDescription(false)}
                disabled={saving}
              >
                <X className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-2">
              <SheetTitle className="flex-1 text-left text-h3 text-slate-900">
                {task.description}
              </SheetTitle>
              {isAdmin && task.status !== "closed" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    setEditDescription(task.description);
                    setEditingDescription(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              )}
            </div>
          )}
          <SheetDescription className="sr-only">Task details</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {/* Context info */}
          <div className="space-y-2 text-body text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <Link
                href={`/inspect/${task.space_id}`}
                className="text-primary-600 hover:underline"
              >
                {task.spaceName}
              </Link>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{task.buildingName}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <span>Created by {task.creatorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{formatRelativeTime(task.created_at)}</span>
            </div>
            {task.due_date && (
              <div
                className={`flex items-center gap-2 ${
                  isOverdue ? "text-fail font-semibold" : ""
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>
                  Due{" "}
                  {new Date(task.due_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {isOverdue && (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
              </div>
            )}
            {task.deficiency_id && (
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-slate-400" />
                <Link
                  href="/deficiencies"
                  className="text-primary-600 hover:underline"
                >
                  View linked deficiency
                </Link>
              </div>
            )}
          </div>

          {/* Task actions */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDuplicate}
                disabled={saving}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="text-fail hover:text-fail"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}

          {/* Assignment section (admin/supervisor only) */}
          {isAdmin && task.status !== "closed" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-caption font-semibold text-slate-500">
                Assign To
              </p>
              <select
                value={assignedTo}
                onChange={(e) => handleAssign(e.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-body text-slate-700 disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority & Due Date section (admin/supervisor only) */}
          {isAdmin && task.status !== "closed" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-caption font-semibold text-slate-500">
                Priority & Due Date
              </p>
              <div className="flex gap-2">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-body text-slate-700"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-body text-slate-700"
                />
              </div>
              <Button
                size="sm"
                className="mt-2"
                onClick={handleUpdatePriorityDueDate}
                disabled={saving}
              >
                {saving && (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                )}
                Save
              </Button>
            </div>
          )}

          {/* Status workflow */}
          {task.status !== "closed" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-caption font-semibold text-slate-500">
                Status
              </p>
              {!showResolveForm ? (
                <div className="flex gap-2">
                  {task.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange("in_progress")}
                      disabled={saving}
                    >
                      {saving && (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      )}
                      Start Work
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("closed")}
                    disabled={saving}
                  >
                    Complete Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-body text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    rows={3}
                    placeholder="Resolution comment (optional)"
                    value={resolutionComment}
                    onChange={(e) => setResolutionComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleClose}
                      disabled={saving}
                    >
                      {saving && (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      )}
                      Close Task
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowResolveForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Closed task info */}
          {task.status === "closed" && (
            <div className="rounded-lg border border-pass-border bg-pass-bg p-3">
              <p className="text-caption font-semibold text-pass">Resolved</p>
              {task.resolved_at && (
                <p className="mt-1 text-caption text-slate-500">
                  {formatRelativeTime(task.resolved_at)}
                </p>
              )}
              {task.resolution_comment && (
                <p className="mt-1 text-body text-slate-700">
                  {task.resolution_comment}
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this task. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-fail text-white hover:bg-red-700"
            >
              {saving && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
