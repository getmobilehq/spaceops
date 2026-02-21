import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Building2, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import type {
  UserProfile,
} from "@/lib/types/helpers";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ClientBuildingCard } from "@/components/dashboard/client-building-card";
import { getAllBuildingStats } from "@/lib/utils/dashboard-queries";
import { getClientComplianceData } from "@/lib/utils/analytics-queries";

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

  // Get building stats + compliance data in parallel
  const [buildingStats, complianceData] = await Promise.all([
    buildingIds.length > 0
      ? getAllBuildingStats(supabase, buildingIds)
      : Promise.resolve([]),
    buildingIds.length > 0
      ? getClientComplianceData(supabase, buildingIds)
      : Promise.resolve([]),
  ]);

  // Build compliance lookup
  const complianceMap = Object.fromEntries(
    complianceData.map((c) => [c.buildingId, c])
  );

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
  const complianceScores = complianceData
    .map((c) => c.complianceScore)
    .filter((s): s is number => s !== null);
  const avgCompliance =
    complianceScores.length > 0
      ? Math.round(
          complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length
        )
      : null;

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-8">
        <p className="text-overline text-slate-400">Portfolio</p>
        <h1 className="text-h1 text-slate-900">{clientOrgName}</h1>
        <p className="mt-1 text-sm-body text-slate-500">Portfolio Dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Buildings"
          value={totalBuildings}
          icon={Building2}
          accent="teal"
        />
        <KpiCard
          label="Avg Pass Rate"
          value={avgPassRate !== null ? `${avgPassRate}%` : "--"}
          icon={TrendingUp}
          accent="blue"
        />
        <KpiCard
          label="Open Deficiencies"
          value={totalDeficiencies}
          icon={AlertTriangle}
          accent="red"
        />
        <KpiCard
          label="Avg Compliance"
          value={avgCompliance !== null ? `${avgCompliance}%` : "--"}
          icon={ShieldCheck}
          accent="amber"
        />
      </div>

      {/* Building Cards */}
      <div className="mt-6">
        <h2 className="mb-3 border-b border-slate-100 pb-2 text-h2 text-slate-900">Buildings</h2>
        {buildingStats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="text-sm-body text-slate-500">
              No buildings linked to your account yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {buildingStats.map((stats) => {
              const compliance = complianceMap[stats.buildingId];
              return (
                <ClientBuildingCard
                  key={stats.buildingId}
                  id={stats.buildingId}
                  name={stats.buildingName}
                  address={stats.address}
                  passRate={stats.passRate}
                  openDeficiencyCount={stats.openDeficiencyCount}
                  inspectedToday={stats.inspectedToday}
                  totalSpaces={stats.totalSpaces}
                  complianceScore={compliance?.complianceScore ?? null}
                  monthlyCompletionRate={compliance?.monthlyCompletionRate ?? null}
                  deficiencyTrend={compliance?.deficiencyTrend ?? 0}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
