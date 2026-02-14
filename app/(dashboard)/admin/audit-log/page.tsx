import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserProfile, AuditLog } from "@/lib/types/helpers";
import { AuditLogList } from "./audit-log-list";

export default async function AuditLogPage() {
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
  if (!profile || profile.role !== "admin") redirect("/");

  // Fetch latest 50 audit log entries
  const { data: logsData } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const logs = (logsData ?? []) as unknown as AuditLog[];

  // Batch lookup user names for all unique user_ids
  const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[];
  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, name")
      .in("id", userIds);
    userMap = Object.fromEntries(
      (usersData ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
    );
  }

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm-body text-slate-500">
          Track all changes across your organization
        </p>
      </div>

      <AuditLogList
        initialLogs={logs}
        userMap={userMap}
        orgId={profile.org_id}
      />
    </div>
  );
}
