import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { exportTasksSchema } from "@/lib/validators/schemas";
import { toCsvString } from "@/lib/utils/csv";
import { rateLimit, rateLimitHeaders } from "@/lib/utils/rate-limit";
import type { Task } from "@/lib/types/helpers";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(user.id, "export", { maxRequests: 10, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }

  const body = await req.json();
  const parsed = exportTasksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const filters = parsed.data;

  let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  const { data: tasksData } = await query.limit(5000);
  const tasks = (tasksData ?? []) as unknown as Task[];

  // Filter by building if needed
  let filteredTasks = tasks;
  if (filters.building_id) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", filters.building_id);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length > 0) {
      const { data: spacesData } = await supabase
        .from("spaces")
        .select("id")
        .in("floor_id", floorIds);

      const spaceIds = new Set((spacesData ?? []).map((s: { id: string }) => s.id));
      filteredTasks = tasks.filter((t) => spaceIds.has(t.space_id));
    } else {
      filteredTasks = [];
    }
  }

  // Enrich with space/building names
  const spaceIds = [...new Set(filteredTasks.map((t) => t.space_id))];
  const assigneeIds = [...new Set(filteredTasks.map((t) => t.assigned_to).filter(Boolean))] as string[];

  const [spacesResult, usersResult] = await Promise.all([
    spaceIds.length > 0
      ? supabase.from("spaces").select("id, name, floor_id").in("id", spaceIds)
      : Promise.resolve({ data: [] }),
    assigneeIds.length > 0
      ? supabase.from("users").select("id, name").in("id", assigneeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const spaces = (spacesResult.data ?? []) as unknown as { id: string; name: string; floor_id: string }[];
  const spaceNameMap = Object.fromEntries(spaces.map((s) => [s.id, s.name]));

  // Get building names via floors
  const floorIds = [...new Set(spaces.map((s) => s.floor_id))];
  let buildingNameBySpace: Record<string, string> = {};

  if (floorIds.length > 0) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id, building_id")
      .in("id", floorIds);

    const floors = (floorsData ?? []) as unknown as { id: string; building_id: string }[];
    const bIds = [...new Set(floors.map((f) => f.building_id))];

    const { data: buildingsData } = await supabase
      .from("buildings")
      .select("id, name")
      .in("id", bIds);

    const bNameMap = Object.fromEntries(
      (buildingsData ?? []).map((b: { id: string; name: string }) => [b.id, b.name])
    );
    const floorBuildingMap = Object.fromEntries(floors.map((f) => [f.id, f.building_id]));

    for (const s of spaces) {
      buildingNameBySpace[s.id] = bNameMap[floorBuildingMap[s.floor_id] ?? ""] ?? "";
    }
  }

  const userNameMap = Object.fromEntries(
    (usersResult.data ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
  );

  const headers = ["Description", "Status", "Priority", "Source", "Space", "Building", "Assigned To", "Due Date", "Created At"];
  const rows = filteredTasks.map((t) => [
    t.description,
    t.status,
    t.priority,
    t.source,
    spaceNameMap[t.space_id] ?? "",
    buildingNameBySpace[t.space_id] ?? "",
    t.assigned_to ? userNameMap[t.assigned_to] ?? "" : "",
    t.due_date ?? "",
    new Date(t.created_at).toISOString(),
  ]);

  const csv = toCsvString(headers, rows);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spaceops_tasks_${date}.csv"`,
    },
  });
}
