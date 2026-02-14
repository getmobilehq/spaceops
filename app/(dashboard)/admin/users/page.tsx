import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserProfile, Invitation, Building, BuildingAssignment } from "@/lib/types/helpers";
import { InviteUserDialog } from "./invite-user-dialog";
import { UserList } from "./user-list";

export default async function AdminUsersPage() {
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

  const { data: usersData } = await supabase
    .from("users")
    .select("*")
    .order("name");

  const users = (usersData ?? []) as unknown as UserProfile[];

  const { data: invitationsData } = await supabase
    .from("invitations")
    .select("*")
    .eq("accepted", false)
    .order("created_at", { ascending: false });

  const invitations = (invitationsData ?? []) as unknown as Invitation[];

  // Fetch buildings and assignments for building assignment feature
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("*")
    .eq("archived", false)
    .order("name");

  const buildings = (buildingsData ?? []) as unknown as Building[];

  const { data: assignmentsData } = await supabase
    .from("building_assignments")
    .select("*");

  const assignments = (assignmentsData ?? []) as unknown as BuildingAssignment[];

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1 text-slate-900">Users</h1>
        <InviteUserDialog orgId={profile.org_id} userId={profile.id} />
      </div>

      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-caption mb-2 font-semibold uppercase tracking-wide text-slate-500">
            Pending Invitations
          </h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-warning-border bg-warning-bg px-4 py-3"
              >
                <div>
                  <p className="text-body text-slate-700">{inv.email}</p>
                  <p className="text-caption text-slate-500 capitalize">
                    {inv.role}
                  </p>
                </div>
                <span className="text-caption text-warning">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <UserList
        users={users}
        currentUserId={profile.id}
        buildings={buildings}
        assignments={assignments}
      />
    </div>
  );
}
