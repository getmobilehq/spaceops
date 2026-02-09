import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Building2, TrendingUp, AlertTriangle } from "lucide-react";
import type {
  UserProfile,
  ClientBuildingLink,
  Building,
  ClientOrg,
} from "@/lib/types/helpers";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BuildingCard } from "@/components/dashboard/building-card";
import { getAllBuildingStats } from "@/lib/utils/dashboard-queries";

export default async function ClientDashboardPage() {
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

  // Non-clients shouldn't be here
  if (profile.role !== "client") {
    redirect("/");
  }

  // Get client org name
  let clientOrgName = "Your Portfolio";
  if (profile.client_org_id) {
    const { data: clientOrgData } = await supabase
      .from("client_orgs")
      .select("name")
      .eq("id", profile.client_org_id)
      .single();

    if (clientOrgData) {
      clientOrgName = (clientOrgData as unknown as { name: string }).name;
    }
  }

  // Get buildings linked to client org
  let buildingIds: string[] = [];
  if (profile.client_org_id) {
    const { data: linksData } = await supabase
      .from("client_building_links")
      .select("building_id")
      .eq("client_org_id", profile.client_org_id);

    buildingIds = (linksData ?? []).map(
      (l: { building_id: string }) => l.building_id
    );
  }

  // Get building stats
  const buildingStats =
    buildingIds.length > 0
      ? await getAllBuildingStats(supabase, buildingIds)
      : [];

  // Compute aggregate KPIs
  const totalBuildings = buildingStats.length;
  const passRates = buildingStats
    .map((s) => s.passRate)
    .filter((r): r is number => r !== null);
  const avgPassRate =
    passRates.length > 0
      ? Math.round(passRates.reduce((a, b) => a + b, 0) / passRates.length)
      : null;
  const totalDeficiencies = buildingStats.reduce(
    (sum, s) => sum + s.openDeficiencyCount,
    0
  );

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">{clientOrgName}</h1>
        <p className="mt-1 text-sm-body text-slate-500">Portfolio Dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Buildings"
          value={totalBuildings}
          icon={Building2}
        />
        <KpiCard
          label="Avg Pass Rate"
          value={avgPassRate !== null ? `${avgPassRate}%` : "--"}
          icon={TrendingUp}
        />
        <KpiCard
          label="Open Deficiencies"
          value={totalDeficiencies}
          icon={AlertTriangle}
        />
      </div>

      {/* Building Cards */}
      <div className="mt-6">
        <h2 className="mb-3 text-h2 text-slate-900">Buildings</h2>
        {buildingStats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="text-sm-body text-slate-500">
              No buildings linked to your account yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
    </div>
  );
}
