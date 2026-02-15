"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Pencil, Trash2 } from "lucide-react";
import type { InspectionSchedule, Building, ChecklistTemplate } from "@/lib/types/helpers";
import { ScheduleFormDialog } from "./schedule-form-dialog";
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

interface EnrichedSchedule extends InspectionSchedule {
  buildingName: string;
  assigneeName: string | null;
}

interface ScheduleListProps {
  schedules: EnrichedSchedule[];
  buildings: Building[];
  users: { id: string; name: string; role: string }[];
  templates: Pick<ChecklistTemplate, "id" | "name" | "version" | "is_canned">[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatFrequency(schedule: EnrichedSchedule): string {
  switch (schedule.frequency) {
    case "daily":
      return `Daily at ${schedule.time_of_day}`;
    case "weekly":
      return `Weekly on ${DAY_NAMES[schedule.day_of_week ?? 0]} at ${schedule.time_of_day}`;
    case "biweekly":
      return `Every 2 weeks on ${DAY_NAMES[schedule.day_of_week ?? 0]} at ${schedule.time_of_day}`;
    case "monthly":
      return `Monthly on the ${schedule.day_of_month ?? 1}${getOrdinal(schedule.day_of_month ?? 1)} at ${schedule.time_of_day}`;
    default:
      return schedule.frequency;
  }
}

function getOrdinal(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export function ScheduleList({ schedules, buildings, users, templates }: ScheduleListProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EnrichedSchedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingSchedule(null);
    setDialogOpen(true);
  };

  const handleEdit = (schedule: EnrichedSchedule) => {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  };

  const handleToggle = async (schedule: EnrichedSchedule) => {
    setToggling(schedule.id);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("inspection_schedules")
      .update({ enabled: !schedule.enabled, updated_at: new Date().toISOString() })
      .eq("id", schedule.id);

    if (error) {
      toast.error("Failed to update schedule");
    } else {
      toast.success(schedule.enabled ? "Schedule paused" : "Schedule enabled");
      router.refresh();
    }
    setToggling(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("inspection_schedules")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Failed to delete schedule");
    } else {
      toast.success("Schedule deleted");
      router.refresh();
    }
    setDeleteId(null);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-slate-900">Inspection Schedules</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure recurring inspection reminders for your buildings
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-16">
          <Calendar className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No schedules yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Create a schedule to automate inspection reminders
          </p>
          <Button onClick={handleCreate} size="sm" className="mt-4">
            <Plus className="mr-1.5 h-4 w-4" />
            Create Schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`rounded-lg border bg-white p-4 transition-colors ${
                schedule.enabled ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {schedule.buildingName}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        schedule.enabled
                          ? "bg-pass-bg text-pass border border-pass-border"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {schedule.enabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatFrequency(schedule)}
                  </p>
                  {schedule.assigneeName && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      Assigned to {schedule.assigneeName}
                    </p>
                  )}
                  {schedule.last_triggered_at && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      Last triggered: {new Date(schedule.last_triggered_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(schedule)}
                    disabled={toggling === schedule.id}
                    className="h-8 text-xs"
                  >
                    {schedule.enabled ? "Pause" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(schedule)}
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteId(schedule.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScheduleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingSchedule={editingSchedule}
        buildings={buildings}
        users={users}
        templates={templates}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this inspection schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-fail hover:bg-fail/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
