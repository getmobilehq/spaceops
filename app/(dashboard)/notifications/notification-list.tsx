"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  UserPlus,
  Bell,
  CheckCheck,
  Loader2,
  CalendarClock,
} from "lucide-react";
import type { Notification } from "@/lib/types/helpers";
import type { NotificationType } from "@/lib/types/database";

interface NotificationListProps {
  notifications: Notification[];
}

const typeIcons: Record<NotificationType, React.ElementType> = {
  task_assigned: ClipboardList,
  sla_warning: Clock,
  overdue: AlertTriangle,
  deficiency_created: AlertCircle,
  inspection_completed: CheckCircle2,
  report_sent: FileText,
  invitation: UserPlus,
  inspection_scheduled: CalendarClock,
};

function groupByDate(notifications: Notification[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Older", items: [] },
  ];

  for (const n of notifications) {
    const date = new Date(n.created_at);
    if (date >= today) {
      groups[0].items.push(n);
    } else if (date >= yesterday) {
      groups[1].items.push(n);
    } else if (date >= weekAgo) {
      groups[2].items.push(n);
    } else {
      groups[3].items.push(n);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export function NotificationList({ notifications }: NotificationListProps) {
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groups = groupByDate(notifications);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);

    if (error) {
      toast.error("Failed to mark all as read");
    } else {
      router.refresh();
    }
    setMarkingAll(false);
  }

  async function handleTap(notif: Notification) {
    const supabase = createBrowserSupabaseClient();

    if (!notif.read) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notif.id);
    }

    if (notif.link) {
      router.push(notif.link);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1 text-slate-900">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm-body text-slate-400">
            No notifications yet
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-caption font-semibold text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((notif) => {
                  const Icon =
                    typeIcons[notif.type as NotificationType] ?? Bell;

                  return (
                    <button
                      key={notif.id}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                        notif.read
                          ? "bg-white hover:bg-slate-50"
                          : "bg-primary-50 hover:bg-primary-100"
                      }`}
                      onClick={() => handleTap(notif)}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          notif.read
                            ? "bg-slate-100"
                            : "bg-primary-100"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            notif.read
                              ? "text-slate-400"
                              : "text-primary-600"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-body ${
                            notif.read
                              ? "text-slate-600"
                              : "font-medium text-slate-900"
                          }`}
                        >
                          {notif.message}
                        </p>
                        <p className="mt-0.5 text-caption text-slate-400">
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                      {!notif.read && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
