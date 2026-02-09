import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  Task,
  Space,
  Floor,
  Building,
  UserProfile,
} from "@/lib/types/helpers";
import { TaskList } from "./task-list";

export interface EnrichedTask {
  id: string;
  deficiency_id: string | null;
  space_id: string;
  assigned_to: string | null;
  created_by: string;
  description: string;
  priority: string;
  status: string;
  source: string;
  due_date: string | null;
  resolution_comment: string | null;
  resolution_photo_url: string | null;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
  spaceName: string;
  buildingName: string;
  buildingId: string;
  assigneeName: string | null;
  creatorName: string;
  isRecurring: boolean;
  recurrenceCount: number;
}

export default async function TasksPage() {
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

  // Fetch tasks (RLS handles visibility: staff see only assigned, admin/supervisor see all)
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  const tasks = (tasksData ?? []) as unknown as Task[];

  // Fetch spaces for context
  const spaceIds = [...new Set(tasks.map((t) => t.space_id))];
  let spaces: Space[] = [];
  if (spaceIds.length > 0) {
    const { data: spacesData } = await supabase
      .from("spaces")
      .select("*")
      .in("id", spaceIds);
    spaces = (spacesData ?? []) as unknown as Space[];
  }

  // Fetch floors for building context
  const floorIds = [...new Set(spaces.map((s) => s.floor_id))];
  let floors: Floor[] = [];
  if (floorIds.length > 0) {
    const { data: floorsData } = await supabase
      .from("floors")
      .select("*")
      .in("id", floorIds);
    floors = (floorsData ?? []) as unknown as Floor[];
  }

  // Fetch buildings
  const buildingIds = [...new Set(floors.map((f) => f.building_id))];
  let buildings: Building[] = [];
  if (buildingIds.length > 0) {
    const { data: buildingsData } = await supabase
      .from("buildings")
      .select("*")
      .in("id", buildingIds);
    buildings = (buildingsData ?? []) as unknown as Building[];
  }

  // Fetch all relevant users (assignees + creators)
  const userIds = [
    ...new Set([
      ...tasks.map((t) => t.assigned_to).filter(Boolean),
      ...tasks.map((t) => t.created_by),
    ]),
  ] as string[];
  let users: UserProfile[] = [];
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .in("id", userIds);
    users = (usersData ?? []) as unknown as UserProfile[];
  }

  // Fetch all staff/supervisor users for the assignment dropdown
  const { data: staffData } = await supabase
    .from("users")
    .select("id, name, role")
    .in("role", ["staff", "supervisor"])
    .eq("active", true)
    .order("name");

  const staffUsers = (staffData ?? []) as unknown as {
    id: string;
    name: string;
    role: string;
  }[];

  // Fetch all active buildings for create-task dialog
  const { data: allBuildingsData } = await supabase
    .from("buildings")
    .select("*")
    .eq("archived", false)
    .order("name");

  const allBuildings = (allBuildingsData ?? []) as unknown as Building[];

  // Fetch all spaces for create-task dialog (with floor context for building mapping)
  const allFloorIds = [
    ...new Set(
      (
        (await supabase.from("floors").select("id, building_id")).data ?? []
      ).map((f: { id: string; building_id: string }) => f)
    ),
  ];
  const floorBuildingMap: Record<string, string> = {};
  const { data: allFloorsData } = await supabase
    .from("floors")
    .select("id, building_id");
  for (const f of (allFloorsData ?? []) as { id: string; building_id: string }[]) {
    floorBuildingMap[f.id] = f.building_id;
  }

  const { data: allSpacesData } = await supabase
    .from("spaces")
    .select("id, name, floor_id")
    .is("deleted_at", null)
    .order("name");

  const allSpaces = (
    (allSpacesData ?? []) as { id: string; name: string; floor_id: string }[]
  ).map((s) => ({
    id: s.id,
    name: s.name,
    buildingId: floorBuildingMap[s.floor_id] ?? "",
  }));

  // Build lookup maps
  const spaceMap = Object.fromEntries(spaces.map((s) => [s.id, s]));
  const floorMap = Object.fromEntries(floors.map((f) => [f.id, f]));
  const buildingMap = Object.fromEntries(buildings.map((b) => [b.id, b]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  // Enrich tasks
  const enriched: EnrichedTask[] = tasks.map((task) => {
    const space = spaceMap[task.space_id];
    const floor = space ? floorMap[space.floor_id] : undefined;
    const building = floor ? buildingMap[floor.building_id] : undefined;
    const assignee = task.assigned_to ? userMap[task.assigned_to] : undefined;
    const creator = userMap[task.created_by];

    return {
      id: task.id,
      deficiency_id: task.deficiency_id,
      space_id: task.space_id,
      assigned_to: task.assigned_to,
      created_by: task.created_by,
      description: task.description,
      priority: task.priority,
      status: task.status,
      source: task.source,
      due_date: task.due_date,
      resolution_comment: task.resolution_comment,
      resolution_photo_url: task.resolution_photo_url,
      created_at: task.created_at,
      resolved_at: task.resolved_at,
      updated_at: task.updated_at,
      spaceName: space?.name ?? "Unknown",
      buildingName: building?.name ?? "Unknown",
      buildingId: building?.id ?? "",
      assigneeName: assignee?.name ?? null,
      creatorName: creator?.name ?? "Unknown",
      isRecurring: false,
      recurrenceCount: 0,
    };
  });

  return (
    <div className="p-4">
      <TaskList
        tasks={enriched}
        buildings={allBuildings}
        spaces={allSpaces}
        staffUsers={staffUsers}
        userRole={profile.role}
        userId={profile.id}
      />
    </div>
  );
}
