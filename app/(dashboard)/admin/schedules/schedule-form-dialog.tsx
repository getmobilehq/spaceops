"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { createScheduleSchema } from "@/lib/validators/schemas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { InspectionSchedule, Building, ChecklistTemplate } from "@/lib/types/helpers";

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSchedule: InspectionSchedule | null;
  buildings: Building[];
  users: { id: string; name: string; role: string }[];
  templates: Pick<ChecklistTemplate, "id" | "name" | "version" | "is_canned">[];
}

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

function calculateNextDue(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  timeOfDay: string
): string {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(":").map(Number);

  switch (frequency) {
    case "daily": {
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next.toISOString();
    }
    case "weekly":
    case "biweekly": {
      const dow = dayOfWeek ?? 1;
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      const daysUntil = ((dow - now.getDay() + 7) % 7) || 7;
      next.setDate(now.getDate() + daysUntil);
      return next.toISOString();
    }
    case "monthly": {
      const dom = dayOfMonth ?? 1;
      let next = new Date(now.getFullYear(), now.getMonth(), dom, hours, minutes);
      if (next <= now) {
        next = new Date(now.getFullYear(), now.getMonth() + 1, dom, hours, minutes);
      }
      return next.toISOString();
    }
    default:
      return new Date(now.getTime() + 86400000).toISOString();
  }
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  editingSchedule,
  buildings,
  users,
  templates,
}: ScheduleFormDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [buildingId, setBuildingId] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [assignedTo, setAssignedTo] = useState("");
  const [templateId, setTemplateId] = useState("");

  // Reset form when dialog opens/closes or editing changes
  useEffect(() => {
    if (open && editingSchedule) {
      setBuildingId(editingSchedule.building_id);
      setFrequency(editingSchedule.frequency);
      setDayOfWeek(String(editingSchedule.day_of_week ?? 1));
      setDayOfMonth(String(editingSchedule.day_of_month ?? 1));
      setTimeOfDay(editingSchedule.time_of_day?.slice(0, 5) ?? "09:00");
      setAssignedTo(editingSchedule.assigned_to ?? "");
      setTemplateId(editingSchedule.checklist_template_id ?? "");
    } else if (open) {
      setBuildingId("");
      setFrequency("daily");
      setDayOfWeek("1");
      setDayOfMonth("1");
      setTimeOfDay("09:00");
      setAssignedTo("");
      setTemplateId("");
    }
    setErrors({});
  }, [open, editingSchedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const input = {
      building_id: buildingId,
      frequency,
      day_of_week: ["weekly", "biweekly"].includes(frequency) ? Number(dayOfWeek) : undefined,
      day_of_month: frequency === "monthly" ? Number(dayOfMonth) : undefined,
      time_of_day: timeOfDay,
      assigned_to: assignedTo || undefined,
      checklist_template_id: templateId || undefined,
    };

    const parsed = createScheduleSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const supabase = createBrowserSupabaseClient();

    // Get user's org_id
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Session expired");
      setSaving(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", userData.user.id)
      .single();

    const orgId = (profileData as unknown as { org_id: string } | null)?.org_id;
    if (!orgId) {
      toast.error("Could not determine organization");
      setSaving(false);
      return;
    }

    const nextDueAt = calculateNextDue(
      frequency,
      ["weekly", "biweekly"].includes(frequency) ? Number(dayOfWeek) : null,
      frequency === "monthly" ? Number(dayOfMonth) : null,
      timeOfDay
    );

    if (editingSchedule) {
      const { error } = await supabase
        .from("inspection_schedules")
        .update({
          building_id: buildingId,
          frequency: frequency as "daily" | "weekly" | "biweekly" | "monthly",
          day_of_week: ["weekly", "biweekly"].includes(frequency) ? Number(dayOfWeek) : null,
          day_of_month: frequency === "monthly" ? Number(dayOfMonth) : null,
          time_of_day: timeOfDay,
          assigned_to: assignedTo || null,
          checklist_template_id: templateId || null,
          next_due_at: nextDueAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSchedule.id);

      if (error) {
        toast.error("Failed to update schedule");
      } else {
        toast.success("Schedule updated");
        onOpenChange(false);
        router.refresh();
      }
    } else {
      const { error } = await supabase.from("inspection_schedules").insert({
        org_id: orgId,
        building_id: buildingId,
        frequency: frequency as "daily" | "weekly" | "biweekly" | "monthly",
        day_of_week: ["weekly", "biweekly"].includes(frequency) ? Number(dayOfWeek) : null,
        day_of_month: frequency === "monthly" ? Number(dayOfMonth) : null,
        time_of_day: timeOfDay,
        assigned_to: assignedTo || null,
        checklist_template_id: templateId || null,
        next_due_at: nextDueAt,
      });

      if (error) {
        toast.error("Failed to create schedule");
      } else {
        toast.success("Schedule created");
        onOpenChange(false);
        router.refresh();
      }
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingSchedule ? "Edit Schedule" : "New Inspection Schedule"}
          </DialogTitle>
          <DialogDescription>
            {editingSchedule
              ? "Update the schedule configuration below."
              : "Set up a recurring inspection reminder for a building."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Building */}
          <div>
            <Label htmlFor="building">Building</Label>
            <select
              id="building"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select building...</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.building_id && (
              <p className="mt-1 text-xs text-fail">{errors.building_id}</p>
            )}
          </div>

          {/* Frequency */}
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 Weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Day of Week (for weekly/biweekly) */}
          {["weekly", "biweekly"].includes(frequency) && (
            <div>
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <select
                id="dayOfWeek"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {frequency === "monthly" && (
            <div>
              <Label htmlFor="dayOfMonth">Day of Month</Label>
              <select
                id="dayOfMonth"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time */}
          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="mt-1"
            />
            {errors.time_of_day && (
              <p className="mt-1 text-xs text-fail">{errors.time_of_day}</p>
            )}
          </div>

          {/* Assigned To */}
          <div>
            <Label htmlFor="assignedTo">Assign To (optional)</Label>
            <select
              id="assignedTo"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All assigned supervisors</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Checklist Template */}
          <div>
            <Label htmlFor="template">Checklist Template (optional)</Label>
            <select
              id="template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Default (per space assignment)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} v{t.version}{t.is_canned ? " (System)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editingSchedule ? "Update" : "Create"} Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
