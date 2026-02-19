import { createAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import type { NotificationType } from "@/lib/types/database";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  message: string;
  link?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    message: params.message,
    link: params.link ?? null,
  });
  if (error) {
    console.error("Failed to create notification:", error);
    Sentry.captureException(error, { tags: { context: "notifications" } });
  }
}

export async function createBulkNotifications(
  notifications: Array<{
    userId: string;
    type: NotificationType;
    message: string;
    link?: string;
  }>
): Promise<void> {
  if (notifications.length === 0) return;
  const supabase = createAdminClient();
  const rows = notifications.map((n) => ({
    user_id: n.userId,
    type: n.type,
    message: n.message,
    link: n.link ?? null,
  }));
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.error("Failed to create bulk notifications:", error);
    Sentry.captureException(error, { tags: { context: "notifications-bulk" } });
  }
}
