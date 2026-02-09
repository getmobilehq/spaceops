import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBuildingStats } from "@/lib/utils/dashboard-queries";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  TrendingUp,
  ClipboardCheck,
  AlertTriangle,
  ListTodo,
  Building2,
} from "lucide-react";
import type { SharedDashboard, Building } from "@/lib/types/helpers";

export default async function SharedDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  // Look up the shared dashboard by token
  const { data: shareData } = await supabase
    .from("shared_dashboards")
    .select("*")
    .eq("token", token)
    .single();

  const share = shareData as unknown as SharedDashboard | null;
  if (!share) notFound();

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    notFound();
  }

  // Get building info
  const { data: buildingData } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", share.building_id)
    .single();

  const building = buildingData as unknown as Building | null;
  if (!building) notFound();

  // Get stats
  const stats = await getBuildingStats(supabase, share.building_id);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-body font-semibold text-slate-900">
              Space<span className="text-primary-600">Ops</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Building info */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-400" />
            <h1 className="text-h1 text-slate-900">{building.name}</h1>
          </div>
          {(building.street || building.city) && (
            <p className="mt-1 text-sm-body text-slate-500">
              {[building.street, building.city, building.state]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Today's Pass Rate"
              value={stats.passRate !== null ? `${stats.passRate}%` : "--"}
              icon={TrendingUp}
            />
            <KpiCard
              label="Inspections Today"
              value={stats.inspectedToday}
              icon={ClipboardCheck}
            />
            <KpiCard
              label="Open Deficiencies"
              value={stats.openDeficiencyCount}
              icon={AlertTriangle}
            />
            <KpiCard
              label="Open Tasks"
              value={stats.openTaskCount}
              icon={ListTodo}
            />
          </div>
        )}

        {/* Completion bar */}
        {stats && stats.totalSpaces > 0 && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-caption font-semibold text-slate-500">
                Today&apos;s Completion
              </span>
              <span className="text-caption font-semibold text-slate-700">
                {stats.inspectedToday}/{stats.totalSpaces} spaces
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{
                  width: `${Math.round((stats.inspectedToday / stats.totalSpaces) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-caption text-slate-400">
          Shared dashboard &middot; Read only
        </p>
      </div>
    </div>
  );
}
