"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Building2 } from "lucide-react";
import type { Building, ReportConfig } from "@/lib/types/helpers";

interface ReportConfigManagerProps {
  buildings: Building[];
  reportConfigs: ReportConfig[];
}

export function ReportConfigManager({
  buildings,
  reportConfigs,
}: ReportConfigManagerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  function getConfig(buildingId: string): ReportConfig | undefined {
    return reportConfigs.find(
      (c) =>
        c.building_id === buildingId && c.trigger_type === "on_completion"
    );
  }

  async function toggleEnabled(buildingId: string) {
    setSaving(buildingId);
    const supabase = createBrowserSupabaseClient();
    const config = getConfig(buildingId);

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

  async function updateEmails(buildingId: string, emails: string) {
    const supabase = createBrowserSupabaseClient();
    const config = getConfig(buildingId);
    if (!config) return;

    const emailList = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

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
      <div className="mb-4">
        <h2 className="text-h2 text-slate-900">Auto-Report Settings</h2>
        <p className="mt-1 text-sm-body text-slate-500">
          Automatically email reports when all spaces in a building are inspected
        </p>
      </div>

      {buildings.length === 0 ? (
        <p className="text-sm-body text-slate-400">No buildings yet</p>
      ) : (
        <div className="space-y-3">
          {buildings.map((building) => {
            const config = getConfig(building.id);
            const enabled = config?.enabled ?? false;
            const emails = Array.isArray(config?.recipient_emails)
              ? (config.recipient_emails as string[]).join(", ")
              : "";

            return (
              <div
                key={building.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-body font-medium text-slate-900">
                      {building.name}
                    </span>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2">
                    <span className="text-caption text-slate-500">
                      {enabled ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      onClick={() => toggleEnabled(building.id)}
                      disabled={saving === building.id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        enabled ? "bg-primary-500" : "bg-slate-200"
                      }`}
                    >
                      {saving === building.id ? (
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
                      <Label className="text-caption">
                        Recipient Emails (comma-separated)
                      </Label>
                    </div>
                    <Input
                      className="mt-1"
                      defaultValue={emails}
                      placeholder="client@example.com, manager@example.com"
                      onBlur={(e) =>
                        updateEmails(building.id, e.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
