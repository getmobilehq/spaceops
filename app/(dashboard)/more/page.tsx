import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Users,
  ClipboardList,
  Settings,
  AlertTriangle,
  FileText,
  Bell,
  User,
  LogOut,
  ScrollText,
  Calendar,
} from "lucide-react";
import type { UserProfile } from "@/lib/types/helpers";
import { MoreMenuItem, MoreMenuSection } from "@/components/layout/more-menu-item";
import { LogoutButton } from "@/app/(dashboard)/profile/logout-button";

export default async function MorePage() {
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

  if (!profileData) redirect("/login");

  const profile = profileData as unknown as UserProfile;
  const isAdmin = profile.role === "admin";
  const isSupervisor = profile.role === "supervisor";

  // Fetch counts in parallel
  const [userCountRes, templateCountRes, deficiencyCountRes, notifCountRes] =
    await Promise.all([
      isAdmin
        ? supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("org_id", profile.org_id)
        : Promise.resolve({ count: 0 }),
      isAdmin
        ? supabase
            .from("checklist_templates")
            .select("*", { count: "exact", head: true })
            .eq("org_id", profile.org_id)
            .eq("archived", false)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("deficiencies")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false),
    ]);

  const userCount = userCountRes.count ?? 0;
  const templateCount = templateCountRes.count ?? 0;
  const deficiencyCount = deficiencyCountRes.count ?? 0;
  const notifCount = notifCountRes.count ?? 0;

  return (
    <div className="p-4 pb-8 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      {/* User info summary */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <User className="h-6 w-6" />
        </div>
        <div>
          <p className="text-h3 text-slate-900">{profile.name}</p>
          <p className="text-caption capitalize text-slate-500">
            {profile.role}
          </p>
        </div>
      </div>

      {/* Admin Console — admin only */}
      {isAdmin && (
        <MoreMenuSection title="Admin Console">
          <MoreMenuItem
            icon={Users}
            label="User Management"
            href="/admin/users"
            count={userCount}
          />
          <MoreMenuItem
            icon={ClipboardList}
            label="Checklist Templates"
            href="/admin/checklists"
            count={templateCount}
          />
          <MoreMenuItem
            icon={Settings}
            label="Organization Settings"
            href="/admin/settings"
          />
          <MoreMenuItem
            icon={Calendar}
            label="Schedules"
            href="/admin/schedules"
          />
          <MoreMenuItem
            icon={ScrollText}
            label="Audit Log"
            href="/admin/audit-log"
          />
        </MoreMenuSection>
      )}

      {/* Operations */}
      <MoreMenuSection title="Operations" className={isAdmin ? "mt-6" : ""}>
        <MoreMenuItem
          icon={AlertTriangle}
          label="Deficiencies"
          href="/deficiencies"
          count={deficiencyCount}
        />
        {isSupervisor && (
          <MoreMenuItem
            icon={Calendar}
            label="Schedules"
            href="/admin/schedules"
          />
        )}
        <MoreMenuItem
          icon={FileText}
          label="Reports"
          href="/reports"
        />
        <MoreMenuItem
          icon={Bell}
          label="Notifications"
          href="/notifications"
          count={notifCount}
        />
      </MoreMenuSection>

      {/* Account */}
      <MoreMenuSection title="Account" className="mt-6">
        <MoreMenuItem icon={User} label="Profile" href="/profile" />
        <div className="px-4 py-3">
          <LogoutButton />
        </div>
      </MoreMenuSection>

      {/* App version */}
      <p className="mt-8 text-center text-caption text-slate-400">
        SpaceOps v1.0
      </p>
    </div>
  );
}
