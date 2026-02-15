import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// ---------- Date Range Helpers ----------

export interface DateRange {
  from: Date;
  to: Date;
}

export function getDateRange(
  period: string,
  customFrom?: string,
  customTo?: string
): DateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  if (period === "custom" && customFrom && customTo) {
    return {
      from: new Date(customFrom),
      to: new Date(customTo),
    };
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);

  switch (period) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    case "30d":
    default:
      from.setDate(from.getDate() - 30);
      break;
  }

  return { from, to };
}

// ---------- Compliance Scores ----------

export interface ComplianceScore {
  buildingId: string;
  buildingName: string;
  score: number;
  totalInspections: number;
  passedInspections: number;
}

export async function getComplianceScores(
  supabase: Client,
  buildingIds: string[],
  dateRange: DateRange
): Promise<ComplianceScore[]> {
  if (buildingIds.length === 0) return [];

  const results: ComplianceScore[] = [];

  for (const buildingId of buildingIds) {
    // Get building name
    const { data: bData } = await supabase
      .from("buildings")
      .select("name")
      .eq("id", buildingId)
      .single();

    const buildingName = (bData as unknown as { name: string } | null)?.name ?? "Unknown";

    // Get floors -> spaces
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", buildingId);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length === 0) {
      results.push({ buildingId, buildingName, score: 0, totalInspections: 0, passedInspections: 0 });
      continue;
    }

    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);

    const spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
    if (spaceIds.length === 0) {
      results.push({ buildingId, buildingName, score: 0, totalInspections: 0, passedInspections: 0 });
      continue;
    }

    // Get completed inspections in date range
    const { data: inspData } = await supabase
      .from("inspections")
      .select("id")
      .in("space_id", spaceIds)
      .eq("status", "completed")
      .gte("completed_at", dateRange.from.toISOString())
      .lte("completed_at", dateRange.to.toISOString());

    const inspIds = (inspData ?? []).map((i: { id: string }) => i.id);
    if (inspIds.length === 0) {
      results.push({ buildingId, buildingName, score: 0, totalInspections: 0, passedInspections: 0 });
      continue;
    }

    // Get responses per inspection
    const { data: respData } = await supabase
      .from("inspection_responses")
      .select("inspection_id, result")
      .in("inspection_id", inspIds);

    const responses = (respData ?? []) as unknown as { inspection_id: string; result: string }[];

    // Calculate per-inspection pass rate
    const inspPassMap: Record<string, { pass: number; total: number }> = {};
    for (const r of responses) {
      if (!inspPassMap[r.inspection_id]) inspPassMap[r.inspection_id] = { pass: 0, total: 0 };
      inspPassMap[r.inspection_id].total++;
      if (r.result === "pass") inspPassMap[r.inspection_id].pass++;
    }

    // Count inspections with 100% pass rate
    let passedInspections = 0;
    for (const counts of Object.values(inspPassMap)) {
      if (counts.total > 0 && counts.pass === counts.total) {
        passedInspections++;
      }
    }

    const totalInspections = inspIds.length;
    const score = totalInspections > 0
      ? Math.round((passedInspections / totalInspections) * 100)
      : 0;

    results.push({ buildingId, buildingName, score, totalInspections, passedInspections });
  }

  return results;
}

// ---------- Inspector Performance ----------

export interface InspectorPerformance {
  userId: string;
  inspectorName: string;
  inspectionCount: number;
  avgPassRate: number;
  avgDurationMinutes: number;
}

export async function getInspectorPerformance(
  supabase: Client,
  dateRange: DateRange
): Promise<InspectorPerformance[]> {
  const { data: inspData } = await supabase
    .from("inspections")
    .select("id, inspector_id, started_at, completed_at")
    .eq("status", "completed")
    .gte("completed_at", dateRange.from.toISOString())
    .lte("completed_at", dateRange.to.toISOString());

  const inspections = (inspData ?? []) as unknown as {
    id: string;
    inspector_id: string;
    started_at: string;
    completed_at: string;
  }[];

  if (inspections.length === 0) return [];

  // Get responses for pass rate calculation
  const inspIds = inspections.map((i) => i.id);
  const { data: respData } = await supabase
    .from("inspection_responses")
    .select("inspection_id, result")
    .in("inspection_id", inspIds);

  const responses = (respData ?? []) as unknown as { inspection_id: string; result: string }[];

  const inspPassMap: Record<string, { pass: number; total: number }> = {};
  for (const r of responses) {
    if (!inspPassMap[r.inspection_id]) inspPassMap[r.inspection_id] = { pass: 0, total: 0 };
    inspPassMap[r.inspection_id].total++;
    if (r.result === "pass") inspPassMap[r.inspection_id].pass++;
  }

  // Group by inspector
  const inspectorMap: Record<string, {
    count: number;
    totalPassRate: number;
    totalDuration: number;
  }> = {};

  for (const insp of inspections) {
    if (!inspectorMap[insp.inspector_id]) {
      inspectorMap[insp.inspector_id] = { count: 0, totalPassRate: 0, totalDuration: 0 };
    }
    inspectorMap[insp.inspector_id].count++;

    const result = inspPassMap[insp.id];
    if (result && result.total > 0) {
      inspectorMap[insp.inspector_id].totalPassRate += (result.pass / result.total) * 100;
    }

    if (insp.started_at && insp.completed_at) {
      const duration = (new Date(insp.completed_at).getTime() - new Date(insp.started_at).getTime()) / 60000;
      inspectorMap[insp.inspector_id].totalDuration += Math.max(0, duration);
    }
  }

  // Get inspector names
  const inspectorIds = Object.keys(inspectorMap);
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name")
    .in("id", inspectorIds);

  const userNameMap = Object.fromEntries(
    (usersData ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
  );

  return inspectorIds
    .map((userId) => {
      const data = inspectorMap[userId];
      return {
        userId,
        inspectorName: userNameMap[userId] ?? "Unknown",
        inspectionCount: data.count,
        avgPassRate: data.count > 0 ? Math.round(data.totalPassRate / data.count) : 0,
        avgDurationMinutes: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
      };
    })
    .sort((a, b) => b.inspectionCount - a.inspectionCount);
}

// ---------- Deficiency Trends ----------

export interface DeficiencyTrendPoint {
  date: string;
  opened: number;
  closed: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface DeficiencyTrends {
  daily: DeficiencyTrendPoint[];
  byCategory: CategoryBreakdown[];
}

export async function getDeficiencyTrends(
  supabase: Client,
  dateRange: DateRange,
  buildingId?: string
): Promise<DeficiencyTrends> {
  // Get relevant space IDs if building filter
  let spaceIds: string[] | undefined;
  if (buildingId) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", buildingId);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length === 0) return { daily: [], byCategory: [] };

    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);

    spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
    if (spaceIds.length === 0) return { daily: [], byCategory: [] };
  }

  // Fetch deficiencies created in range
  let query = supabase
    .from("deficiencies")
    .select("id, status, created_at, resolved_at, inspection_response_id")
    .gte("created_at", dateRange.from.toISOString())
    .lte("created_at", dateRange.to.toISOString());

  if (spaceIds) {
    query = query.in("space_id", spaceIds);
  }

  const { data: defData } = await query;
  const deficiencies = (defData ?? []) as unknown as {
    id: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
    inspection_response_id: string | null;
  }[];

  // Also fetch deficiencies resolved in range (may have been created before)
  let resolvedQuery = supabase
    .from("deficiencies")
    .select("id, resolved_at")
    .not("resolved_at", "is", null)
    .gte("resolved_at", dateRange.from.toISOString())
    .lte("resolved_at", dateRange.to.toISOString());

  if (spaceIds) {
    resolvedQuery = resolvedQuery.in("space_id", spaceIds);
  }

  const { data: resolvedData } = await resolvedQuery;
  const resolvedDefs = (resolvedData ?? []) as unknown as { id: string; resolved_at: string }[];

  // Build daily counts
  const openedByDate: Record<string, number> = {};
  const closedByDate: Record<string, number> = {};

  for (const d of deficiencies) {
    const dateStr = new Date(d.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    openedByDate[dateStr] = (openedByDate[dateStr] || 0) + 1;
  }

  for (const d of resolvedDefs) {
    const dateStr = new Date(d.resolved_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    closedByDate[dateStr] = (closedByDate[dateStr] || 0) + 1;
  }

  const allDates = [...new Set([...Object.keys(openedByDate), ...Object.keys(closedByDate)])];
  const daily = allDates.map((date) => ({
    date,
    opened: openedByDate[date] || 0,
    closed: closedByDate[date] || 0,
  }));

  // Category breakdown via inspection_responses -> checklist_items
  const responseIds = deficiencies
    .map((d) => d.inspection_response_id)
    .filter((id): id is string => id !== null);

  const byCategory: CategoryBreakdown[] = [];
  if (responseIds.length > 0) {
    const { data: respData } = await supabase
      .from("inspection_responses")
      .select("checklist_item_id")
      .in("id", responseIds);

    const itemIds = [...new Set(
      (respData ?? []).map((r: { checklist_item_id: string }) => r.checklist_item_id)
    )];

    if (itemIds.length > 0) {
      const { data: itemsData } = await supabase
        .from("checklist_items")
        .select("id, category")
        .in("id", itemIds);

      const items = (itemsData ?? []) as unknown as { id: string; category: string | null }[];
      const itemCategoryMap = Object.fromEntries(
        items.map((i) => [i.id, i.category || "General"])
      );

      // Map response -> item -> category
      const respItemMap = Object.fromEntries(
        (respData ?? []).map((r: { id?: string; checklist_item_id: string }) => [
          r.checklist_item_id,
          r.checklist_item_id,
        ])
      );

      const categoryCounts: Record<string, number> = {};
      for (const r of respData ?? []) {
        const itemId = (r as { checklist_item_id: string }).checklist_item_id;
        const cat = itemCategoryMap[itemId] || "General";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }

      for (const [category, count] of Object.entries(categoryCounts)) {
        byCategory.push({ category, count });
      }
      byCategory.sort((a, b) => b.count - a.count);
    }
  }

  return { daily, byCategory };
}

// ---------- Space Type Analysis ----------

export interface SpaceTypeAnalysis {
  spaceType: string;
  totalInspections: number;
  failRate: number;
}

export async function getSpaceTypeAnalysis(
  supabase: Client,
  dateRange: DateRange
): Promise<SpaceTypeAnalysis[]> {
  // Get all space types
  const { data: typesData } = await supabase
    .from("space_types")
    .select("id, name");

  const types = (typesData ?? []) as unknown as { id: string; name: string }[];
  if (types.length === 0) return [];

  const typeNameMap = Object.fromEntries(types.map((t) => [t.id, t.name]));

  // Get spaces with their type
  const { data: spacesData } = await supabase
    .from("spaces")
    .select("id, space_type_id")
    .is("deleted_at", null);

  const spaces = (spacesData ?? []) as unknown as { id: string; space_type_id: string | null }[];
  const spaceTypeMap = Object.fromEntries(
    spaces.filter((s) => s.space_type_id).map((s) => [s.id, s.space_type_id!])
  );

  // Get completed inspections in date range
  const { data: inspData } = await supabase
    .from("inspections")
    .select("id, space_id")
    .eq("status", "completed")
    .gte("completed_at", dateRange.from.toISOString())
    .lte("completed_at", dateRange.to.toISOString());

  const inspections = (inspData ?? []) as unknown as { id: string; space_id: string }[];
  if (inspections.length === 0) return [];

  // Get responses
  const inspIds = inspections.map((i) => i.id);
  const { data: respData } = await supabase
    .from("inspection_responses")
    .select("inspection_id, result")
    .in("inspection_id", inspIds);

  const responses = (respData ?? []) as unknown as { inspection_id: string; result: string }[];

  // Map inspection_id -> space_id
  const inspSpaceMap = Object.fromEntries(inspections.map((i) => [i.id, i.space_id]));

  // Aggregate by space type
  const typeStats: Record<string, { inspections: Set<string>; fails: number; total: number }> = {};

  for (const r of responses) {
    const spaceId = inspSpaceMap[r.inspection_id];
    const typeId = spaceId ? spaceTypeMap[spaceId] : undefined;
    if (!typeId) continue;

    if (!typeStats[typeId]) {
      typeStats[typeId] = { inspections: new Set(), fails: 0, total: 0 };
    }
    typeStats[typeId].inspections.add(r.inspection_id);
    typeStats[typeId].total++;
    if (r.result === "fail") typeStats[typeId].fails++;
  }

  return Object.entries(typeStats)
    .map(([typeId, stats]) => ({
      spaceType: typeNameMap[typeId] || "Unknown",
      totalInspections: stats.inspections.size,
      failRate: stats.total > 0 ? Math.round((stats.fails / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.failRate - a.failRate);
}

// ---------- Client Compliance Data ----------

export interface ClientComplianceData {
  buildingId: string;
  complianceScore: number | null;
  monthlyCompletionRate: number | null;
  activeDeficiencies: number;
  deficiencyTrend: number; // positive = increasing (bad), negative = decreasing (good)
}

export async function getClientComplianceData(
  supabase: Client,
  buildingIds: string[]
): Promise<ClientComplianceData[]> {
  if (buildingIds.length === 0) return [];

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const results: ClientComplianceData[] = [];

  for (const buildingId of buildingIds) {
    // Get spaces for building
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", buildingId);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length === 0) {
      results.push({ buildingId, complianceScore: null, monthlyCompletionRate: null, activeDeficiencies: 0, deficiencyTrend: 0 });
      continue;
    }

    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);

    const spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
    if (spaceIds.length === 0) {
      results.push({ buildingId, complianceScore: null, monthlyCompletionRate: null, activeDeficiencies: 0, deficiencyTrend: 0 });
      continue;
    }

    // Compliance: inspections in last 30 days with 100% pass rate
    const { data: inspData } = await supabase
      .from("inspections")
      .select("id")
      .in("space_id", spaceIds)
      .eq("status", "completed")
      .gte("completed_at", thirtyDaysAgo.toISOString());

    const inspIds = (inspData ?? []).map((i: { id: string }) => i.id);

    let complianceScore: number | null = null;
    if (inspIds.length > 0) {
      const { data: respData } = await supabase
        .from("inspection_responses")
        .select("inspection_id, result")
        .in("inspection_id", inspIds);

      const responses = (respData ?? []) as unknown as { inspection_id: string; result: string }[];
      const inspPassMap: Record<string, { pass: number; total: number }> = {};
      for (const r of responses) {
        if (!inspPassMap[r.inspection_id]) inspPassMap[r.inspection_id] = { pass: 0, total: 0 };
        inspPassMap[r.inspection_id].total++;
        if (r.result === "pass") inspPassMap[r.inspection_id].pass++;
      }

      let passed = 0;
      for (const counts of Object.values(inspPassMap)) {
        if (counts.total > 0 && counts.pass === counts.total) passed++;
      }
      complianceScore = inspIds.length > 0 ? Math.round((passed / inspIds.length) * 100) : null;
    }

    // Monthly completion rate: unique spaces inspected / total spaces
    const inspectedSpaces = new Set<string>();
    if (inspIds.length > 0) {
      const { data: inspDetailData } = await supabase
        .from("inspections")
        .select("space_id")
        .in("id", inspIds);

      for (const i of (inspDetailData ?? []) as { space_id: string }[]) {
        inspectedSpaces.add(i.space_id);
      }
    }
    const monthlyCompletionRate = spaceIds.length > 0
      ? Math.round((inspectedSpaces.size / spaceIds.length) * 100)
      : null;

    // Active deficiencies
    const { count: activeCount } = await supabase
      .from("deficiencies")
      .select("*", { count: "exact", head: true })
      .in("space_id", spaceIds)
      .in("status", ["open", "in_progress"]);

    // Previous period deficiencies for trend
    const { count: prevCount } = await supabase
      .from("deficiencies")
      .select("*", { count: "exact", head: true })
      .in("space_id", spaceIds)
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString());

    const { count: currCount } = await supabase
      .from("deficiencies")
      .select("*", { count: "exact", head: true })
      .in("space_id", spaceIds)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const deficiencyTrend = (currCount ?? 0) - (prevCount ?? 0);

    results.push({
      buildingId,
      complianceScore,
      monthlyCompletionRate,
      activeDeficiencies: activeCount ?? 0,
      deficiencyTrend,
    });
  }

  return results;
}
