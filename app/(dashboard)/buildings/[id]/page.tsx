import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import {
  MapPin,
  Layers,
  ArrowLeft,
  LayoutGrid,
  Map,
  ClipboardCheck,
  AlertTriangle,
  ListTodo,
  TrendingUp,
  Clock,
  Share2,
  Archive,
  History,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Building, Floor, UserProfile } from "@/lib/types/helpers";
import { ArchiveBuildingButton } from "./archive-building-button";
import { ShareDashboardButton } from "./share-dashboard-button";
import { formatSqft, formatRelativeTime } from "@/lib/utils/format";
import { FloorManager } from "./floor-manager";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  getBuildingStats,
  getRecentInspections,
  getCompletionTrendData,
} from "@/lib/utils/dashboard-queries";
import { TrendChart } from "@/components/dashboard/trend-chart";

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const profile = profileData as unknown as UserProfile | null;
  if (!profile) redirect("/login");

  const { data: buildingData } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", id)
    .single();

  const building = buildingData as unknown as Building | null;
  if (!building) notFound();

  const { data: floorsData } = await supabase
    .from("floors")
    .select("*")
    .eq("building_id", id)
    .order("display_order");

  const floors = (floorsData ?? []) as unknown as Floor[];
  const floorIds = floors.map((f) => f.id);

  // Get spaces for this building
  let spaceIds: string[] = [];
  if (floorIds.length > 0) {
    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);
    spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
  }

  // Fetch stats, inspections, and trend data in parallel
  const [stats, recentInspections, trendData7, trendData30, trendData90] =
    await Promise.all([
      getBuildingStats(supabase, id),
      getRecentInspections(supabase, spaceIds, 5),
      getCompletionTrendData(supabase, id, 7),
      getCompletionTrendData(supabase, id, 30),
      getCompletionTrendData(supabase, id, 90),
    ]);

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <Link
        href="/buildings"
        className="mb-4 inline-flex items-center gap-1 text-sm-body text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Buildings
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-h1 text-slate-900">{building.name}</h1>
            {(building.street || building.city) && (
              <div className="mt-1 flex items-center gap-1 text-sm-body text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {[building.street, building.city, building.state]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {building.sqft && (
              <p className="mt-1 text-caption text-slate-400">
                {formatSqft(building.sqft)}
              </p>
            )}
          </div>
          {profile.role === "admin" && (
            <div className="flex items-center gap-2">
              <ShareDashboardButton buildingId={building.id} />
              <ArchiveBuildingButton buildingId={building.id} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* KPI Cards */}
        {stats && (
          <section>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
          </section>
        )}

        {/* Floors */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-5 w-5 text-slate-400" />
            <h2 className="text-h2 text-slate-900">Floors</h2>
          </div>
          <FloorManager
            buildingId={building.id}
            floors={floors}
            isAdmin={profile.role === "admin"}
          />
        </section>

        {/* View Map CTA */}
        {floors.length > 0 && (
          <section>
            <Link href={`/buildings/${building.id}/map/${floors[0].id}`}>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-primary-300 hover:bg-primary-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <Map className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-body font-semibold text-slate-900">
                    View Floor Map
                  </p>
                  <p className="text-caption text-slate-500">
                    Visual floor plan with live status pins
                  </p>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Spaces */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-slate-400" />
              <h2 className="text-h2 text-slate-900">Spaces</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-caption font-semibold text-slate-500">
                {spaceIds.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {stats && stats.openDeficiencyCount > 0 && (
                <Link href="/deficiencies">
                  <span className="flex items-center gap-1 rounded-full bg-fail-bg px-2.5 py-1 text-caption font-semibold text-fail">
                    <AlertTriangle className="h-3 w-3" />
                    {stats.openDeficiencyCount} deficiencies
                  </span>
                </Link>
              )}
              <Link href={`/buildings/${building.id}/spaces`}>
                <Button variant="outline" size="sm">
                  Manage Spaces
                </Button>
              </Link>
            </div>
          </div>
          {spaceIds.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
              <p className="text-sm-body text-slate-500">
                No spaces added yet
              </p>
              <Link href={`/buildings/${building.id}/spaces`}>
                <Button variant="outline" size="sm" className="mt-2">
                  Add Spaces
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Recent Inspections */}
        {recentInspections.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                <h2 className="text-h2 text-slate-900">Recent Inspections</h2>
              </div>
              <Link href={`/buildings/${building.id}/inspections`}>
                <span className="flex items-center gap-1 text-caption font-semibold text-primary-600 hover:text-primary-700">
                  <History className="h-3 w-3" />
                  View All
                </span>
              </Link>
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {recentInspections.map((insp) => {
                const total = insp.passCount + insp.failCount;
                return (
                  <Link
                    key={insp.id}
                    href={`/inspect/${insp.spaceId}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium text-slate-900">
                        {insp.spaceName}
                      </p>
                      <p className="text-caption text-slate-400">
                        {insp.inspectorName} &middot;{" "}
                        {formatRelativeTime(insp.completedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {total > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            insp.failCount === 0
                              ? "bg-pass-bg text-pass"
                              : "bg-fail-bg text-fail"
                          }`}
                        >
                          {insp.passCount}/{total}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Trend Chart */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <TrendChart
            data7={trendData7}
            data30={trendData30}
            data90={trendData90}
          />
        </section>
      </div>
    </div>
  );
}
