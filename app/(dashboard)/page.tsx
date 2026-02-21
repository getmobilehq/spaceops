import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Building2,
  ClipboardList,
  AlertTriangle,
  Users,
  Clock,
  ChevronRight,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { UserProfile, Building } from "@/lib/types/helpers";
import type { TaskPriority } from "@/lib/types/database";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BuildingCard } from "@/components/dashboard/building-card";
import { PriorityBadge } from "@/components/shared/priority-badge";
import {
  getTodayInspectionCount,
  getOpenDeficiencyCount,
  getActiveStaffCount,
  getAllBuildingStats,
  getOverdueTasks,
  getRepeatFailures,
  getCompletionTrendData,
} from "@/lib/utils/dashboard-queries";
import { RepeatFailuresWidget } from "@/components/dashboard/repeat-failures-widget";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { QuickActionCard } from "@/components/dashboard/quick-action-card";
import { InspectorLeaderboard } from "@/components/dashboard/inspector-leaderboard";
import { getInspectorPerformance } from "@/lib/utils/analytics-queries";
import { formatRelativeTime } from "@/lib/utils/format";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profileData) redirect("/login");

  const profile = profileData as unknown as UserProfile;

  // Redirect clients and staff to their dashboards
  if (profile.role === "client") {
    redirect("/client");
  }
  if (profile.role === "staff") {
    redirect("/staff");
  }

  // Fetch buildings
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("*")
    .eq("archived", false)
    .order("name");

  const buildings = (buildingsData ?? []) as unknown as Building[];
  const buildingIds = buildings.map((b) => b.id);

  // Fetch dashboard data in parallel
  // Date range for inspector performance (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const performanceDateRange = { from: thirtyDaysAgo, to: new Date() };

  const [
    inspectionCount,
    deficiencyCount,
    staffCount,
    buildingStats,
    overdueTasks,
    repeatFailures,
    trendData7,
    trendData30,
    trendData90,
    adminUserCount,
    adminTemplateCount,
    inspectorPerformance,
  ] = await Promise.all([
    getTodayInspectionCount(supabase),
    getOpenDeficiencyCount(supabase),
    getActiveStaffCount(supabase),
    buildingIds.length > 0
      ? getAllBuildingStats(supabase, buildingIds)
      : Promise.resolve([]),
    getOverdueTasks(supabase),
    getRepeatFailures(supabase),
    getCompletionTrendData(supabase, undefined, 7),
    getCompletionTrendData(supabase, undefined, 30),
    getCompletionTrendData(supabase, undefined, 90),
    profile.role === "admin"
      ? supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("org_id", profile.org_id)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
    profile.role === "admin"
      ? supabase
          .from("checklist_templates")
          .select("*", { count: "exact", head: true })
          .eq("org_id", profile.org_id)
          .eq("archived", false)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
    getInspectorPerformance(supabase, performanceDateRange),
  ]);

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-8">
        <p className="text-overline text-slate-400">Dashboard</p>
        <h1 className="text-display text-slate-900">
          Welcome, {profile.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm-body text-slate-500">
          Here&apos;s your overview for today
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          label="Buildings"
          value={buildings.length}
          icon={Building2}
          accent="teal"
        />
        <KpiCard
          label="Inspections Today"
          value={inspectionCount}
          icon={ClipboardList}
          accent="blue"
        />
        <KpiCard
          label="Open Deficiencies"
          value={deficiencyCount}
          icon={AlertTriangle}
          accent="red"
        />
        <KpiCard
          label="Active Staff"
          value={staffCount}
          icon={Users}
          accent="amber"
        />
      </div>

      {/* Admin Quick Actions */}
      {profile.role === "admin" && (
        <div className="mt-6">
          <h2 className="mb-3 border-b border-slate-100 pb-2 text-h3 text-slate-900">Admin Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickActionCard
              icon={Users}
              label="Users"
              description={`${adminUserCount} member${adminUserCount !== 1 ? "s" : ""}`}
              href="/admin/users"
            />
            <QuickActionCard
              icon={ClipboardList}
              label="Checklists"
              description={`${adminTemplateCount} template${adminTemplateCount !== 1 ? "s" : ""}`}
              href="/admin/checklists"
            />
            <QuickActionCard
              icon={Settings}
              label="Settings"
              href="/admin/settings"
            />
          </div>
        </div>
      )}

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="h-4 w-4 text-fail" />
            <h2 className="text-h3 text-slate-900">Overdue Tasks</h2>
          </div>
          <div className="rounded-lg border border-fail-border bg-fail-bg">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 border-b border-fail-border px-4 py-3 last:border-b-0"
              >
                <PriorityBadge priority={task.priority as TaskPriority} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-slate-900">
                    {task.spaceName}
                  </p>
                  <p className="truncate text-caption text-slate-500">
                    {task.description}
                  </p>
                </div>
                <span className="shrink-0 text-caption font-semibold text-fail">
                  {task.daysOverdue}d overdue
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buildings */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-h2 text-slate-900">Buildings</h2>
          <Link
            href="/buildings"
            className="flex items-center gap-1 text-caption font-semibold text-primary-600 hover:text-primary-700"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {buildings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="text-h3 text-slate-700">No buildings yet</p>
            <p className="mt-1 text-sm-body text-slate-500">
              Get started by adding your first building
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {buildingStats.map((stats) => (
              <BuildingCard
                key={stats.buildingId}
                id={stats.buildingId}
                name={stats.buildingName}
                address={stats.address}
                passRate={stats.passRate}
                openDeficiencyCount={stats.openDeficiencyCount}
                inspectedToday={stats.inspectedToday}
                totalSpaces={stats.totalSpaces}
              />
            ))}
          </div>
        )}
      </div>
      {/* Trend Chart */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <TrendChart
          data7={trendData7}
          data30={trendData30}
          data90={trendData90}
        />
      </div>

      {/* Repeat Failures + Inspector Leaderboard */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <RepeatFailuresWidget failures={repeatFailures} />
        <InspectorLeaderboard
          inspectors={inspectorPerformance
            .sort((a, b) => b.inspectionCount - a.inspectionCount)
            .slice(0, 5)
            .map((ip) => ({
              inspectorName: ip.inspectorName,
              inspectionCount: ip.inspectionCount,
              avgPassRate: ip.avgPassRate,
            }))}
        />
      </div>
    </div>
  );
}
