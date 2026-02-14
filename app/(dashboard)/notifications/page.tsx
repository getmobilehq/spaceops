import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Notification, UserProfile } from "@/lib/types/helpers";
import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
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

  // Fetch notifications (RLS enforces user_id = auth.uid())
  const { data: notifData } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = (notifData ?? []) as unknown as Notification[];

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <NotificationList notifications={notifications} />
    </div>
  );
}
