import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  ScanLine,
  Calendar,
  Bell,
  ChevronRight,
} from "lucide-react";
import type { UserProfile, Task, Notification } from "@/lib/types/helpers";
import type { InspectionSchedule } from "@/lib/types/helpers";
import type { TaskPriority } from "@/lib/types/database";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { QuickActionCard } from "@/components/dashboard/quick-action-card";
import { formatRelativeTime } from "@/lib/utils/format";

export default async function StaffHomePage() {
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

  if (profile.role !== "staff") {
    redirect("/");
  }

  // Fetch data in parallel
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [tasksResult, schedulesResult, notificationsResult] = await Promise.all([
    // Open tasks assigned to me
    supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", user.id)
      .in("status", ["open", "in_progress"])
      .order("priority")
      .order("due_date")
      .limit(10),
    // Today's schedules assigned to me
    supabase
      .from("inspection_schedules")
      .select("*")
      .eq("assigned_to", user.id)
      .eq("enabled", true)
      .gte("next_due_at", todayStart.toISOString())
      .lte("next_due_at", todayEnd.toISOString()),
    // Recent notifications
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const tasks = (tasksResult.data ?? []) as unknown as Task[];
  const schedules = (schedulesResult.data ?? []) as unknown as InspectionSchedule[];
  const notifications = (notificationsResult.data ?? []) as unknown as Notification[];

  // Enrich tasks with space/building names
  const spaceIds = [...new Set(tasks.map((t) => t.space_id))];
  let spaceMap: Record<string, { name: string; buildingName: string }> = {};

  if (spaceIds.length > 0) {
    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id, name, floor_id")
      .in("id", spaceIds);

    const spaces = (spacesData ?? []) as unknown as { id: string; name: string; floor_id: string }[];
    const floorIds = [...new Set(spaces.map((s) => s.floor_id))];

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

    const buildingNameMap = Object.fromEntries(
      (buildingsData ?? []).map((b: { id: string; name: string }) => [b.id, b.name])
    );
    const floorBuildingMap = Object.fromEntries(floors.map((f) => [f.id, f.building_id]));

    spaceMap = Object.fromEntries(
      spaces.map((s) => [
        s.id,
        {
          name: s.name,
          buildingName: buildingNameMap[floorBuildingMap[s.floor_id] ?? ""] ?? "Unknown",
        },
      ])
    );
  }

  // Enrich schedules with building names
  const scheduleBuildingIds = [...new Set(schedules.map((s) => s.building_id))];
  let scheduleBuildingMap: Record<string, string> = {};
  if (scheduleBuildingIds.length > 0) {
    const { data: bData } = await supabase
      .from("buildings")
      .select("id, name")
      .in("id", scheduleBuildingIds);

    scheduleBuildingMap = Object.fromEntries(
      (bData ?? []).map((b: { id: string; name: string }) => [b.id, b.name])
    );
  }

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">
          Welcome, {profile.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s your work for today
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <QuickActionCard
          icon={ClipboardList}
          label="View Tasks"
          description={`${tasks.length} open`}
          href="/tasks"
        />
        <QuickActionCard
          icon={ScanLine}
          label="Scan QR"
          description="Start inspection"
          href="/scan"
        />
      </div>

      {/* My Tasks */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 text-slate-900">My Tasks</h2>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-caption font-semibold text-primary-600 hover:text-primary-700"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No tasks assigned</p>
            <p className="mt-1 text-sm text-slate-400">
              You&apos;re all caught up
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const space = spaceMap[task.space_id];
              return (
                <Link
                  key={task.id}
                  href="/tasks"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50"
                >
                  <PriorityBadge priority={task.priority as TaskPriority} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {task.description.length > 60
                        ? task.description.slice(0, 60) + "..."
                        : task.description}
                    </p>
                    <p className="truncate text-caption text-slate-400">
                      {space
                        ? `${space.buildingName} - ${space.name}`
                        : "Unknown location"}
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                  {task.due_date && (
                    <span className="shrink-0 text-caption text-slate-400">
                      {formatRelativeTime(task.due_date)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      {schedules.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-h2 text-slate-900">Today&apos;s Schedule</h2>
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <Calendar className="h-5 w-5 shrink-0 text-primary-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {scheduleBuildingMap[schedule.building_id] ?? "Unknown Building"}
                  </p>
                  <p className="text-caption text-slate-400">
                    Scheduled at {schedule.time_of_day?.slice(0, 5) ?? "09:00"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-h2 text-slate-900">Recent Alerts</h2>
            <Link
              href="/notifications"
              className="flex items-center gap-1 text-caption font-semibold text-primary-600 hover:text-primary-700"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <Bell className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">{notif.message}</p>
                  <p className="text-caption text-slate-400">
                    {formatRelativeTime(notif.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
