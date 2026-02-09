import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type {
  Building,
  Space,
  Inspection,
  Deficiency,
  Task,
  InspectionResponse,
  UserProfile,
} from "@/lib/types/helpers";
import type { RepeatFailure } from "@/components/dashboard/repeat-failures-widget";

type Client = SupabaseClient<Database>;

// ---------- Building Stats ----------

export interface BuildingStats {
  buildingId: string;
  buildingName: string;
  address: string;
  passRate: number | null;
  openDeficiencyCount: number;
  openTaskCount: number;
  inspectedToday: number;
  totalSpaces: number;
}

export async function getBuildingStats(
  supabase: Client,
  buildingId: string
): Promise<BuildingStats | null> {
  const { data: buildingData } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", buildingId)
    .single();

  const building = buildingData as unknown as Building | null;
  if (!building) return null;

  // Get floors for this building
  const { data: floorsData } = await supabase
    .from("floors")
    .select("id")
    .eq("building_id", buildingId);

  const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
  if (floorIds.length === 0) {
    return {
      buildingId: building.id,
      buildingName: building.name,
      address: [building.street, building.city, building.state]
        .filter(Boolean)
        .join(", "),
      passRate: null,
      openDeficiencyCount: 0,
      openTaskCount: 0,
      inspectedToday: 0,
      totalSpaces: 0,
    };
  }

  // Get spaces
  const { data: spacesData } = await supabase
    .from("spaces")
    .select("id")
    .in("floor_id", floorIds)
    .is("deleted_at", null);

  const spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
  const totalSpaces = spaceIds.length;

  if (spaceIds.length === 0) {
    return {
      buildingId: building.id,
      buildingName: building.name,
      address: [building.street, building.city, building.state]
        .filter(Boolean)
        .join(", "),
      passRate: null,
      openDeficiencyCount: 0,
      openTaskCount: 0,
      inspectedToday: 0,
      totalSpaces: 0,
    };
  }

  // Today's date range
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Inspections completed today
  const { data: todayInspections } = await supabase
    .from("inspections")
    .select("id, space_id")
    .in("space_id", spaceIds)
    .eq("status", "completed")
    .gte("completed_at", todayStart.toISOString())
    .lte("completed_at", todayEnd.toISOString());

  const inspectedTodaySpaceIds = new Set(
    (todayInspections ?? []).map((i: { space_id: string }) => i.space_id)
  );

  // Pass rate from today's responses
  let passRate: number | null = null;
  const todayInspectionIds = (todayInspections ?? []).map(
    (i: { id: string }) => i.id
  );
  if (todayInspectionIds.length > 0) {
    const { data: responses } = await supabase
      .from("inspection_responses")
      .select("result")
      .in("inspection_id", todayInspectionIds);

    const resp = (responses ?? []) as unknown as { result: string }[];
    const total = resp.length;
    const passCount = resp.filter((r) => r.result === "pass").length;
    passRate = total > 0 ? Math.round((passCount / total) * 100) : null;
  }

  // Open deficiencies
  const { count: defCount } = await supabase
    .from("deficiencies")
    .select("*", { count: "exact", head: true })
    .in("space_id", spaceIds)
    .in("status", ["open", "in_progress"]);

  // Open tasks
  const { count: taskCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .in("space_id", spaceIds)
    .in("status", ["open", "in_progress"]);

  return {
    buildingId: building.id,
    buildingName: building.name,
    address: [building.street, building.city, building.state]
      .filter(Boolean)
      .join(", "),
    passRate,
    openDeficiencyCount: defCount ?? 0,
    openTaskCount: taskCount ?? 0,
    inspectedToday: inspectedTodaySpaceIds.size,
    totalSpaces,
  };
}

export async function getAllBuildingStats(
  supabase: Client,
  buildingIds: string[]
): Promise<BuildingStats[]> {
  const results = await Promise.all(
    buildingIds.map((id) => getBuildingStats(supabase, id))
  );
  return results.filter((r): r is BuildingStats => r !== null);
}

// ---------- Org-wide Counts ----------

export async function getTodayInspectionCount(
  supabase: Client
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("inspections")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", todayStart.toISOString());

  return count ?? 0;
}

export async function getOpenDeficiencyCount(
  supabase: Client
): Promise<number> {
  const { count } = await supabase
    .from("deficiencies")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);

  return count ?? 0;
}

export async function getActiveStaffCount(supabase: Client): Promise<number> {
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "staff")
    .eq("active", true);

  return count ?? 0;
}

// ---------- Overdue Tasks ----------

export interface OverdueTask {
  id: string;
  spaceName: string;
  description: string;
  priority: string;
  dueDate: string;
  daysOverdue: number;
}

export async function getOverdueTasks(
  supabase: Client,
  limit = 5
): Promise<OverdueTask[]> {
  const now = new Date().toISOString();

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["open", "in_progress"])
    .not("due_date", "is", null)
    .lt("due_date", now)
    .order("due_date")
    .limit(limit);

  const tasks = (tasksData ?? []) as unknown as Task[];
  if (tasks.length === 0) return [];

  // Get space names
  const spaceIds = [...new Set(tasks.map((t) => t.space_id))];
  const { data: spacesData } = await supabase
    .from("spaces")
    .select("id, name")
    .in("id", spaceIds);

  const spaceMap = Object.fromEntries(
    (spacesData ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
  );

  return tasks.map((t) => ({
    id: t.id,
    spaceName: spaceMap[t.space_id] ?? "Unknown",
    description: t.description,
    priority: t.priority,
    dueDate: t.due_date!,
    daysOverdue: Math.floor(
      (Date.now() - new Date(t.due_date!).getTime()) / 86400000
    ),
  }));
}

// ---------- Recent Inspections ----------

export interface RecentInspection {
  id: string;
  spaceId: string;
  spaceName: string;
  inspectorName: string;
  completedAt: string;
  passCount: number;
  failCount: number;
}

export async function getRecentInspections(
  supabase: Client,
  spaceIds: string[],
  limit = 5
): Promise<RecentInspection[]> {
  if (spaceIds.length === 0) return [];

  const { data: inspData } = await supabase
    .from("inspections")
    .select("*")
    .in("space_id", spaceIds)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  const inspections = (inspData ?? []) as unknown as Inspection[];
  if (inspections.length === 0) return [];

  // Get space names
  const uniqueSpaceIds = [...new Set(inspections.map((i) => i.space_id))];
  const { data: spacesData } = await supabase
    .from("spaces")
    .select("id, name")
    .in("id", uniqueSpaceIds);

  const spaceMap = Object.fromEntries(
    (spacesData ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
  );

  // Get inspector names
  const inspectorIds = [...new Set(inspections.map((i) => i.inspector_id))];
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name")
    .in("id", inspectorIds);

  const userMap = Object.fromEntries(
    (usersData ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
  );

  // Get response counts per inspection
  const inspIds = inspections.map((i) => i.id);
  const { data: respData } = await supabase
    .from("inspection_responses")
    .select("inspection_id, result")
    .in("inspection_id", inspIds);

  const responses = (respData ?? []) as unknown as {
    inspection_id: string;
    result: string;
  }[];

  const countMap: Record<string, { pass: number; fail: number }> = {};
  for (const r of responses) {
    if (!countMap[r.inspection_id]) {
      countMap[r.inspection_id] = { pass: 0, fail: 0 };
    }
    if (r.result === "pass") countMap[r.inspection_id].pass++;
    else if (r.result === "fail") countMap[r.inspection_id].fail++;
  }

  return inspections.map((i) => ({
    id: i.id,
    spaceId: i.space_id,
    spaceName: spaceMap[i.space_id] ?? "Unknown",
    inspectorName: userMap[i.inspector_id] ?? "Unknown",
    completedAt: i.completed_at!,
    passCount: countMap[i.id]?.pass ?? 0,
    failCount: countMap[i.id]?.fail ?? 0,
  }));
}

// ---------- Repeat Failures ----------

export async function getRepeatFailures(
  supabase: Client,
  buildingId?: string,
  limit = 5
): Promise<RepeatFailure[]> {
  // Get all fail responses with their space and checklist item info
  let spaceIds: string[] | undefined;

  if (buildingId) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", buildingId);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length === 0) return [];

    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);

    spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
    if (spaceIds.length === 0) return [];
  }

  // Get fail responses grouped by space + checklist item
  let query = supabase
    .from("inspection_responses")
    .select("checklist_item_id, inspection_id")
    .eq("result", "fail");

  // We need to filter by space through inspections
  const { data: failResponses } = await query;
  const responses = (failResponses ?? []) as unknown as {
    checklist_item_id: string;
    inspection_id: string;
  }[];

  if (responses.length === 0) return [];

  // Get inspections to map to spaces
  const inspIds = [...new Set(responses.map((r) => r.inspection_id))];
  let inspQuery = supabase
    .from("inspections")
    .select("id, space_id")
    .in("id", inspIds);

  if (spaceIds) {
    inspQuery = inspQuery.in("space_id", spaceIds);
  }

  const { data: inspData } = await inspQuery;
  const inspMap = Object.fromEntries(
    (inspData ?? []).map((i: { id: string; space_id: string }) => [
      i.id,
      i.space_id,
    ])
  );

  // Count failures per (space_id, checklist_item_id)
  const counts: Record<string, number> = {};
  for (const r of responses) {
    const sId = inspMap[r.inspection_id];
    if (!sId) continue;
    const key = `${sId}:${r.checklist_item_id}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  // Filter 3+ failures and sort desc
  const repeats = Object.entries(counts)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (repeats.length === 0) return [];

  // Fetch space and item names
  const repeatSpaceIds = [
    ...new Set(repeats.map(([key]) => key.split(":")[0])),
  ];
  const repeatItemIds = [
    ...new Set(repeats.map(([key]) => key.split(":")[1])),
  ];

  const { data: spacesData } = await supabase
    .from("spaces")
    .select("id, name, floor_id")
    .in("id", repeatSpaceIds);

  const spaces = (spacesData ?? []) as unknown as {
    id: string;
    name: string;
    floor_id: string;
  }[];
  const spaceNameMap = Object.fromEntries(spaces.map((s) => [s.id, s.name]));
  const spaceFloorMap = Object.fromEntries(
    spaces.map((s) => [s.id, s.floor_id])
  );

  // Get building names via floors
  const floorIds = [...new Set(spaces.map((s) => s.floor_id))];
  const { data: floorsData } = await supabase
    .from("floors")
    .select("id, building_id")
    .in("id", floorIds);

  const floorBuildingMap = Object.fromEntries(
    (floorsData ?? []).map((f: { id: string; building_id: string }) => [
      f.id,
      f.building_id,
    ])
  );

  const bIds = [...new Set(Object.values(floorBuildingMap))];
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("id, name")
    .in("id", bIds);

  const buildingNameMap = Object.fromEntries(
    (buildingsData ?? []).map((b: { id: string; name: string }) => [
      b.id,
      b.name,
    ])
  );

  const { data: itemsData } = await supabase
    .from("checklist_items")
    .select("id, description")
    .in("id", repeatItemIds);

  const itemMap = Object.fromEntries(
    (itemsData ?? []).map((i: { id: string; description: string }) => [
      i.id,
      i.description,
    ])
  );

  return repeats.map(([key, count]) => {
    const [sId, iId] = key.split(":");
    const floorId = spaceFloorMap[sId];
    const bId = floorId ? floorBuildingMap[floorId] : undefined;
    return {
      spaceName: spaceNameMap[sId] ?? "Unknown",
      buildingName: bId ? buildingNameMap[bId] ?? "Unknown" : "Unknown",
      itemDescription: itemMap[iId] ?? "Unknown item",
      count,
      spaceId: sId,
    };
  });
}

// ---------- Trend Data ----------

export interface TrendDataPoint {
  date: string;
  rate: number;
}

export async function getCompletionTrendData(
  supabase: Client,
  buildingId?: string,
  days = 30
): Promise<TrendDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  let spaceIds: string[] | undefined;
  if (buildingId) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", buildingId);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length === 0) return [];

    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);

    spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
    if (spaceIds.length === 0) return [];
  }

  // Fetch completed inspections in the date range
  let inspQuery = supabase
    .from("inspections")
    .select("id, completed_at")
    .eq("status", "completed")
    .gte("completed_at", startDate.toISOString())
    .order("completed_at");

  if (spaceIds) {
    inspQuery = inspQuery.in("space_id", spaceIds);
  }

  const { data: inspData } = await inspQuery;
  const inspections = (inspData ?? []) as unknown as {
    id: string;
    completed_at: string;
  }[];

  if (inspections.length === 0) return [];

  // Get responses for these inspections
  const inspIds = inspections.map((i) => i.id);
  const { data: respData } = await supabase
    .from("inspection_responses")
    .select("inspection_id, result")
    .in("inspection_id", inspIds);

  const responses = (respData ?? []) as unknown as {
    inspection_id: string;
    result: string;
  }[];

  // Build per-inspection pass/total
  const inspResultMap: Record<string, { pass: number; total: number }> = {};
  for (const r of responses) {
    if (!inspResultMap[r.inspection_id]) {
      inspResultMap[r.inspection_id] = { pass: 0, total: 0 };
    }
    inspResultMap[r.inspection_id].total++;
    if (r.result === "pass") inspResultMap[r.inspection_id].pass++;
  }

  // Group by date
  const dateMap: Record<string, { pass: number; total: number }> = {};
  for (const insp of inspections) {
    const dateStr = new Date(insp.completed_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (!dateMap[dateStr]) dateMap[dateStr] = { pass: 0, total: 0 };
    const result = inspResultMap[insp.id];
    if (result) {
      dateMap[dateStr].pass += result.pass;
      dateMap[dateStr].total += result.total;
    }
  }

  return Object.entries(dateMap).map(([date, { pass, total }]) => ({
    date,
    rate: total > 0 ? Math.round((pass / total) * 100) : 0,
  }));
}
