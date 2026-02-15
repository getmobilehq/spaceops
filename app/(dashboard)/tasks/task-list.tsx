"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatRelativeTime } from "@/lib/utils/format";
import {
  AlertTriangle,
  Calendar,
  User,
  Zap,
  X,
  CheckCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Building } from "@/lib/types/helpers";
import type { TaskStatus, TaskPriority } from "@/lib/types/database";
import type { EnrichedTask } from "./page";
import { TaskDetailSheet } from "./task-detail-sheet";
import { CreateTaskDialog } from "./create-task-dialog";
import { ExportButton } from "@/components/shared/export-button";

interface TaskListProps {
  tasks: EnrichedTask[];
  buildings: Building[];
  spaces: { id: string; name: string; buildingId: string }[];
  staffUsers: { id: string; name: string; role: string }[];
  userRole: string;
  userId: string;
}

const statusFilters: { label: string; value: TaskStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Closed", value: "closed" },
];

const priorityFilters: {
  label: string;
  value: TaskPriority | "all";
}[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export function TaskList({
  tasks,
  buildings,
  spaces,
  staffUsers,
  userRole,
  userId,
}: TaskListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<
    TaskPriority | "all"
  >("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<string>("");

  const isAdmin = userRole === "admin" || userRole === "supervisor";

  // Filter
  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter)
      return false;
    if (buildingFilter !== "all" && t.buildingId !== buildingFilter)
      return false;
    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned" && t.assigned_to !== null)
        return false;
      if (
        assigneeFilter !== "unassigned" &&
        t.assigned_to !== assigneeFilter
      )
        return false;
    }
    return true;
  });

  // Sort: due date ascending (null last), then created_at descending
  const sorted = [...filtered].sort((a, b) => {
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  const now = Date.now();

  function toggleSelect(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((t) => t.id)));
    }
  }

  async function bulkClose() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "closed",
        resolved_at: new Date().toISOString(),
      })
      .in("id", Array.from(selectedIds));

    setBulkLoading(false);
    if (error) {
      toast.error("Failed to close tasks");
      return;
    }

    toast.success(`${selectedIds.size} task(s) closed`);
    setSelectedIds(new Set());
    router.refresh();
  }

  async function bulkReassign() {
    if (selectedIds.size === 0 || !reassignUserId) return;
    setBulkLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: reassignUserId })
      .in("id", Array.from(selectedIds));

    setBulkLoading(false);
    if (error) {
      toast.error("Failed to reassign tasks");
      return;
    }

    const userName = staffUsers.find((u) => u.id === reassignUserId)?.name ?? "user";
    toast.success(`${selectedIds.size} task(s) reassigned to ${userName}`);
    setSelectedIds(new Set());
    setReassignUserId("");
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1 text-slate-900">Tasks</h1>
        <div className="flex items-center gap-2">
          <ExportButton
            exportType="tasks"
            filters={{
              status: statusFilter,
              priority: priorityFilter,
              building_id: buildingFilter !== "all" ? buildingFilter : undefined,
              assignee: assigneeFilter !== "all" ? assigneeFilter : undefined,
            }}
          />
          {isAdmin && (
            <CreateTaskDialog
              userId={userId}
              buildings={buildings}
              spaces={spaces}
              staffUsers={staffUsers}
            />
          )}
        </div>
      </div>

      {/* Status pills */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              className={`rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                statusFilter === sf.value
                  ? "bg-primary-100 text-primary-700"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              onClick={() => setStatusFilter(sf.value)}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority pills */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {priorityFilters.map((pf) => (
            <button
              key={pf.value}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                priorityFilter === pf.value
                  ? "bg-primary-100 text-primary-700"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              onClick={() => setPriorityFilter(pf.value)}
            >
              {pf.label}
            </button>
          ))}
        </div>

        {/* Building filter */}
        {buildings.length > 1 && (
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-caption text-slate-600"
          >
            <option value="all">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        {/* Assignee filter (admin/supervisor only) */}
        {isAdmin && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-caption text-slate-600"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {staffUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Results count + select all */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-caption text-slate-400">
          {sorted.length} task{sorted.length === 1 ? "" : "s"}
        </p>
        {isAdmin && sorted.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="text-caption font-semibold text-primary-600 hover:text-primary-700"
          >
            {selectedIds.size === sorted.length ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
          <span className="text-caption font-semibold text-primary-700">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-caption text-primary-600 hover:text-primary-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={bulkClose}
              disabled={bulkLoading}
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Close All
            </Button>
            <div className="flex items-center gap-1">
              <select
                value={reassignUserId}
                onChange={(e) => setReassignUserId(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-caption text-slate-600"
              >
                <option value="">Reassign to...</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={bulkReassign}
                disabled={bulkLoading || !reassignUserId}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Reassign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm-body text-slate-400">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => {
            const isOverdue =
              task.due_date &&
              task.status !== "closed" &&
              new Date(task.due_date).getTime() < now;

            return (
              <div key={task.id} className="flex items-start gap-2">
                {/* Checkbox for bulk selection */}
                {isAdmin && (
                  <div className="mt-3.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleSelect(task.id)}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600"
                    />
                  </div>
                )}

                <button
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  {/* Top row: badges */}
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
                        Recurring
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-1.5 line-clamp-2 text-body font-medium text-slate-900">
                    {task.description}
                  </p>

                  {/* Context */}
                  <div className="mt-1 flex items-center gap-3 text-caption text-slate-400">
                    <span>
                      {task.spaceName} · {task.buildingName}
                    </span>
                    <span>{formatRelativeTime(task.created_at)}</span>
                  </div>

                  {/* Bottom row: assignee + due date */}
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-caption text-slate-500">
                      <User className="h-3 w-3" />
                      {task.assigneeName ?? "Unassigned"}
                    </span>
                    {task.due_date && (
                      <span
                        className={`flex items-center gap-1 text-caption font-semibold ${
                          isOverdue ? "text-fail" : "text-slate-500"
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        {isOverdue && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {new Date(task.due_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        staffUsers={staffUsers}
        isAdmin={isAdmin}
      />
    </div>
  );
}
