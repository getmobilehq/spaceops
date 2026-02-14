import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { User, Mail, Shield, Building2 } from "lucide-react";
import type { UserProfile } from "@/lib/types/helpers";
import { NotificationPrefsForm } from "./notification-prefs-form";

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) redirect("/login");

  const profile = data as unknown as UserProfile;
  const notifPrefs = (profile.notification_prefs ?? {}) as {
    sms?: boolean;
    in_app?: boolean;
    email?: boolean;
  };

  return (
    <div className="p-4 lg:mx-auto lg:max-w-xl lg:px-6 lg:py-6">
      <h1 className="text-h1 mb-6 text-slate-900">Profile</h1>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-h3 text-slate-900">{profile.name}</p>
              <p className="text-caption text-slate-500 capitalize">
                {profile.role}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <ProfileRow icon={Mail} label="Email" value={profile.email} />
          <ProfileRow
            icon={Shield}
            label="Role"
            value={profile.role}
            capitalize
          />
          <ProfileRow
            icon={Building2}
            label="Organization"
            value={profile.org_id}
            mono
          />
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="mt-6">
        <NotificationPrefsForm userId={profile.id} prefs={notifPrefs} />
      </div>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  capitalize,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <Icon className="h-4 w-4 text-slate-400" />
      <div>
        <p className="text-caption text-slate-500">{label}</p>
        <p
          className={`text-body text-slate-700 ${capitalize ? "capitalize" : ""} ${mono ? "font-mono text-caption" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
