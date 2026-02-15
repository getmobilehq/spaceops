import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  InspectionSchedule,
  Building,
  UserProfile,
  ChecklistTemplate,
} from "@/lib/types/helpers";
import { ScheduleList } from "./schedule-list";

export default async function SchedulesPage() {
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

  // Only admin/supervisor can manage schedules
  if (!["admin", "supervisor"].includes(profile.role)) {
    redirect("/");
  }

  // Fetch schedules
  const { data: schedulesData } = await supabase
    .from("inspection_schedules")
    .select("*")
    .order("created_at", { ascending: false });

  const schedules = (schedulesData ?? []) as unknown as InspectionSchedule[];

  // Fetch buildings for context + dropdown
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("*")
    .eq("archived", false)
    .order("name");

  const buildings = (buildingsData ?? []) as unknown as Building[];

  // Fetch active staff/supervisors for assignment dropdown
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name, role")
    .in("role", ["staff", "supervisor", "admin"])
    .eq("active", true)
    .order("name");

  const users = (usersData ?? []) as unknown as {
    id: string;
    name: string;
    role: string;
  }[];

  // Fetch checklist templates for dropdown
  const { data: templatesData } = await supabase
    .from("checklist_templates")
    .select("id, name, version, is_canned")
    .eq("archived", false)
    .order("name");

  const templates = (templatesData ?? []) as unknown as Pick<
    ChecklistTemplate,
    "id" | "name" | "version" | "is_canned"
  >[];

  // Build lookup maps
  const buildingMap = Object.fromEntries(buildings.map((b) => [b.id, b.name]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const enrichedSchedules = schedules.map((s) => ({
    ...s,
    buildingName: buildingMap[s.building_id] ?? "Unknown",
    assigneeName: s.assigned_to ? userMap[s.assigned_to] ?? "Unknown" : null,
  }));

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <ScheduleList
        schedules={enrichedSchedules}
        buildings={buildings}
        users={users}
        templates={templates}
      />
    </div>
  );
}
