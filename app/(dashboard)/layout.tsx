import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DashboardShell } from "./dashboard-shell";
import type { UserProfile } from "@/lib/types/helpers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) {
    redirect("/login");
  }

  const profile = data as unknown as UserProfile;

  return (
    <DashboardShell
      profile={{
        id: profile.id,
        org_id: profile.org_id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        active: profile.active,
      }}
    >
      {children}
    </DashboardShell>
  );
}
