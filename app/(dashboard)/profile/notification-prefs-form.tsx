"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, MessageSquare, Mail, Loader2, Phone } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface NotificationPrefsFormProps {
  userId: string;
  prefs: {
    sms?: boolean;
    in_app?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  };
}

export function NotificationPrefsForm({ userId, prefs }: NotificationPrefsFormProps) {
  const router = useRouter();
  const [sms, setSms] = useState(prefs.sms !== false);
  const [inApp, setInApp] = useState(prefs.in_app !== false);
  const [email, setEmail] = useState(prefs.email !== false);
  const [whatsapp, setWhatsapp] = useState(prefs.whatsapp === true);
  const [saving, setSaving] = useState(false);

  async function handleToggle(
    key: "sms" | "in_app" | "email" | "whatsapp",
    value: boolean
  ) {
    if (key === "sms") setSms(value);
    if (key === "in_app") setInApp(value);
    if (key === "email") setEmail(value);
    if (key === "whatsapp") setWhatsapp(value);

    setSaving(true);
    const supabase = createBrowserSupabaseClient();

    const updatedPrefs = {
      sms: key === "sms" ? value : sms,
      in_app: key === "in_app" ? value : inApp,
      email: key === "email" ? value : email,
      whatsapp: key === "whatsapp" ? value : whatsapp,
    };

    const { error } = await supabase
      .from("users")
      .update({ notification_prefs: updatedPrefs })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      toast.error("Failed to save preferences");
      // Revert
      if (key === "sms") setSms(!value);
      if (key === "in_app") setInApp(!value);
      if (key === "email") setEmail(!value);
      if (key === "whatsapp") setWhatsapp(!value);
      return;
    }

    toast.success("Preferences saved");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-400" />
          <h2 className="text-h3 text-slate-900">Notification Preferences</h2>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        <ToggleRow
          icon={MessageSquare}
          label="SMS Notifications"
          description="Receive task assignments and SLA warnings via text"
          checked={sms}
          onChange={(val) => handleToggle("sms", val)}
        />
        <ToggleRow
          icon={Bell}
          label="In-App Notifications"
          description="Show notifications in the notification center"
          checked={inApp}
          onChange={(val) => handleToggle("in_app", val)}
        />
        <ToggleRow
          icon={Mail}
          label="Email Notifications"
          description="Receive reports and summaries by email"
          checked={email}
          onChange={(val) => handleToggle("email", val)}
        />
        <ToggleRow
          icon={Phone}
          label="WhatsApp Notifications"
          description="Receive task assignments and SLA warnings via WhatsApp"
          checked={whatsapp}
          onChange={(val) => handleToggle("whatsapp", val)}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-slate-700">{label}</p>
        <p className="text-caption text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
