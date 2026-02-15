"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Building2, Clock } from "lucide-react";
import type { Building, ReportConfig } from "@/lib/types/helpers";
import { formatRelativeTime } from "@/lib/utils/format";

interface ReportConfigManagerProps {
  buildings: Building[];
  reportConfigs: ReportConfig[];
}

type Tab = "auto" | "scheduled";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly:1", label: "Weekly (Monday)" },
  { value: "weekly:2", label: "Weekly (Tuesday)" },
  { value: "weekly:3", label: "Weekly (Wednesday)" },
  { value: "weekly:4", label: "Weekly (Thursday)" },
  { value: "weekly:5", label: "Weekly (Friday)" },
  { value: "biweekly:1", label: "Biweekly (Monday)" },
  { value: "biweekly:5", label: "Biweekly (Friday)" },
  { value: "monthly:1", label: "Monthly (1st)" },
  { value: "monthly:15", label: "Monthly (15th)" },
];

export function ReportConfigManager({
  buildings,
  reportConfigs,
}: ReportConfigManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("auto");
  const [saving, setSaving] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState<string | null>(null);

  // --- Auto Reports (on_completion) ---
  function getAutoConfig(buildingId: string): ReportConfig | undefined {
    return reportConfigs.find(
      (c) => c.building_id === buildingId && c.trigger_type === "on_completion"
    );
  }

  async function toggleAutoEnabled(buildingId: string) {
    setSaving(buildingId);
    const supabase = createBrowserSupabaseClient();
    const config = getAutoConfig(buildingId);

    if (config) {
      await supabase
        .from("report_configs")
        .update({ enabled: !config.enabled })
        .eq("id", config.id);
    } else {
      await supabase.from("report_configs").insert({
        building_id: buildingId,
        trigger_type: "on_completion" as const,
        report_type: "summary" as const,
        enabled: true,
        recipient_emails: [],
      });
    }

    router.refresh();
    setSaving(null);
  }

  async function updateAutoEmails(buildingId: string, emails: string) {
    const supabase = createBrowserSupabaseClient();
    const config = getAutoConfig(buildingId);
    if (!config) return;

    const emailList = emails.split(",").map((e) => e.trim()).filter(Boolean);
    const { error } = await supabase
      .from("report_configs")
      .update({ recipient_emails: emailList })
      .eq("id", config.id);

    if (error) {
      toast.error("Failed to update recipients");
    } else {
      toast.success("Recipients updated");
      router.refresh();
    }
  }

  // --- Scheduled Reports ---
  function getScheduledConfig(buildingId: string): ReportConfig | undefined {
    return reportConfigs.find(
      (c) => c.building_id === buildingId && c.trigger_type === "scheduled"
    );
  }

  async function toggleScheduledEnabled(buildingId: string) {
    setScheduleSaving(buildingId);
    const supabase = createBrowserSupabaseClient();
    const config = getScheduledConfig(buildingId);

    if (config) {
      await supabase
        .from("report_configs")
        .update({ enabled: !config.enabled })
        .eq("id", config.id);
    } else {
      await supabase.from("report_configs").insert({
        building_id: buildingId,
        trigger_type: "scheduled" as const,
        report_type: "summary" as const,
        schedule_cron: "daily",
        enabled: true,
        recipient_emails: [],
      });
    }

    router.refresh();
    setScheduleSaving(null);
  }

  async function updateScheduleFrequency(buildingId: string, frequency: string) {
    const supabase = createBrowserSupabaseClient();
    const config = getScheduledConfig(buildingId);
    if (!config) return;

    const { error } = await supabase
      .from("report_configs")
      .update({ schedule_cron: frequency })
      .eq("id", config.id);

    if (error) {
      toast.error("Failed to update schedule");
    } else {
      toast.success("Schedule updated");
      router.refresh();
    }
  }

  async function updateScheduledEmails(buildingId: string, emails: string) {
    const supabase = createBrowserSupabaseClient();
    const config = getScheduledConfig(buildingId);
    if (!config) return;

    const emailList = emails.split(",").map((e) => e.trim()).filter(Boolean);
    const { error } = await supabase
      .from("report_configs")
      .update({ recipient_emails: emailList })
      .eq("id", config.id);

    if (error) {
      toast.error("Failed to update recipients");
    } else {
      toast.success("Recipients updated");
      router.refresh();
    }
  }

  return (
    <div>
      {/* Tab switcher */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setTab("auto")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "auto"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Auto Reports
        </button>
        <button
          onClick={() => setTab("scheduled")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "scheduled"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Scheduled Reports
        </button>
      </div>

      {/* Auto Reports Tab */}
      {tab === "auto" && (
        <div>
          <div className="mb-4">
            <h2 className="text-h2 text-slate-900">Auto-Report Settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Automatically email reports when all spaces in a building are inspected
            </p>
          </div>

          {buildings.length === 0 ? (
            <p className="text-sm text-slate-400">No buildings yet</p>
          ) : (
            <div className="space-y-3">
              {buildings.map((building) => {
                const config = getAutoConfig(building.id);
                const enabled = config?.enabled ?? false;
                const emails = Array.isArray(config?.recipient_emails)
                  ? (config.recipient_emails as string[]).join(", ")
                  : "";

                return (
                  <BuildingToggleCard
                    key={building.id}
                    building={building}
                    enabled={enabled}
                    saving={saving === building.id}
                    emails={emails}
                    onToggle={() => toggleAutoEnabled(building.id)}
                    onUpdateEmails={(e) => updateAutoEmails(building.id, e)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scheduled Reports Tab */}
      {tab === "scheduled" && (
        <div>
          <div className="mb-4">
            <h2 className="text-h2 text-slate-900">Scheduled Reports</h2>
            <p className="mt-1 text-sm text-slate-500">
              Send reports on a recurring schedule (daily, weekly, biweekly, or monthly)
            </p>
          </div>

          {buildings.length === 0 ? (
            <p className="text-sm text-slate-400">No buildings yet</p>
          ) : (
            <div className="space-y-3">
              {buildings.map((building) => {
                const config = getScheduledConfig(building.id);
                const enabled = config?.enabled ?? false;
                const emails = Array.isArray(config?.recipient_emails)
                  ? (config.recipient_emails as string[]).join(", ")
                  : "";
                const scheduleCron = config?.schedule_cron ?? "daily";

                return (
                  <div
                    key={building.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {building.name}
                        </span>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {enabled ? "Enabled" : "Disabled"}
                        </span>
                        <button
                          onClick={() => toggleScheduledEnabled(building.id)}
                          disabled={scheduleSaving === building.id}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            enabled ? "bg-primary-500" : "bg-slate-200"
                          }`}
                        >
                          {scheduleSaving === building.id ? (
                            <Loader2 className="mx-auto h-3 w-3 animate-spin text-white" />
                          ) : (
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                                enabled ? "translate-x-4.5" : "translate-x-0.5"
                              }`}
                            />
                          )}
                        </button>
                      </label>
                    </div>

                    {enabled && (
                      <div className="mt-3 space-y-3">
                        {/* Frequency */}
                        <div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <Label className="text-xs font-medium">Frequency</Label>
                          </div>
                          <select
                            value={scheduleCron}
                            onChange={(e) =>
                              updateScheduleFrequency(building.id, e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            {FREQUENCY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Recipients */}
                        <div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <Label className="text-xs font-medium">
                              Recipient Emails (comma-separated)
                            </Label>
                          </div>
                          <Input
                            className="mt-1"
                            defaultValue={emails}
                            placeholder="client@example.com, manager@example.com"
                            onBlur={(e) =>
                              updateScheduledEmails(building.id, e.target.value)
                            }
                          />
                        </div>

                        {/* Last sent */}
                        {config?.last_sent_at && (
                          <p className="text-xs text-slate-400">
                            Last sent: {formatRelativeTime(config.last_sent_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Reusable card for auto-report toggle
function BuildingToggleCard({
  building,
  enabled,
  saving,
  emails,
  onToggle,
  onUpdateEmails,
}: {
  building: Building;
  enabled: boolean;
  saving: boolean;
  emails: string;
  onToggle: () => void;
  onUpdateEmails: (emails: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-900">
            {building.name}
          </span>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <span className="text-xs text-slate-500">
            {enabled ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={onToggle}
            disabled={saving}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              enabled ? "bg-primary-500" : "bg-slate-200"
            }`}
          >
            {saving ? (
              <Loader2 className="mx-auto h-3 w-3 animate-spin text-white" />
            ) : (
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                  enabled ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            )}
          </button>
        </label>
      </div>

      {enabled && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <Label className="text-xs font-medium">
              Recipient Emails (comma-separated)
            </Label>
          </div>
          <Input
            className="mt-1"
            defaultValue={emails}
            placeholder="client@example.com, manager@example.com"
            onBlur={(e) => onUpdateEmails(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
