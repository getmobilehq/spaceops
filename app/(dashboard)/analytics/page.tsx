import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserProfile, Building } from "@/lib/types/helpers";
import {
  getDateRange,
  getComplianceScores,
  getInspectorPerformance,
  getDeficiencyTrends,
  getSpaceTypeAnalysis,
} from "@/lib/utils/analytics-queries";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
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

  if (profile.role !== "admin" && profile.role !== "supervisor") {
    redirect("/");
  }

  const { period = "30d", from, to } = await searchParams;
  const dateRange = getDateRange(period, from, to);

  // Fetch buildings
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("archived", false)
    .order("name");

  const buildings = (buildingsData ?? []) as unknown as Pick<Building, "id" | "name">[];
  const buildingIds = buildings.map((b) => b.id);

  // Fetch all analytics data in parallel
  const [complianceScores, inspectorPerformance, deficiencyTrends, spaceTypeAnalysis] =
    await Promise.all([
      getComplianceScores(supabase, buildingIds, dateRange),
      getInspectorPerformance(supabase, dateRange),
      getDeficiencyTrends(supabase, dateRange),
      getSpaceTypeAnalysis(supabase, dateRange),
    ]);

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <AnalyticsClient
        complianceScores={complianceScores}
        inspectorPerformance={inspectorPerformance}
        deficiencyTrends={deficiencyTrends}
        spaceTypeAnalysis={spaceTypeAnalysis}
      />
    </div>
  );
}
