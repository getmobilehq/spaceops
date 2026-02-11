import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, sendWhatsApp } from "@/lib/utils/sms";
import { createNotification } from "@/lib/utils/notifications";
import type { Task, UserProfile } from "@/lib/types/helpers";

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    // Find tasks due within 4 hours that are not closed and have an assignee
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .in("status", ["open", "in_progress"])
      .not("assigned_to", "is", null)
      .not("due_date", "is", null)
      .gt("due_date", now.toISOString())
      .lte("due_date", fourHoursLater.toISOString());

    const tasks = (tasksData ?? []) as unknown as Task[];
    let smsSent = 0;

    for (const task of tasks) {
      if (!task.assigned_to || !task.due_date) continue;

      // Check if SLA warning already sent for this task in last 4 hours
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", task.assigned_to)
        .eq("type", "sla_warning")
        .gte(
          "created_at",
          new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
        )
        .ilike("link", `%${task.id}%`);

      if ((count ?? 0) > 0) continue;

      // Fetch assignee
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", task.assigned_to)
        .single();

      const user = userData as unknown as UserProfile | null;
      if (!user) continue;

      // Fetch space name
      const { data: spaceData } = await supabase
        .from("spaces")
        .select("name")
        .eq("id", task.space_id)
        .single();

      const spaceName =
        (spaceData as unknown as { name: string } | null)?.name ?? "Unknown";

      const hoursLeft = Math.max(
        1,
        Math.round(
          (new Date(task.due_date).getTime() - now.getTime()) / 3600000
        )
      );
      const message = `SpaceOps SLA Warning: Task in ${spaceName} is due in ${hoursLeft}h — "${task.description.slice(0, 60)}"`;

      const prefs = (user.notification_prefs ?? {}) as {
        sms?: boolean;
        in_app?: boolean;
        whatsapp?: boolean;
      };

      // Create in-app notification
      if (prefs.in_app !== false) {
        await createNotification({
          userId: user.id,
          type: "sla_warning",
          message,
          link: `/tasks#${task.id}`,
        });
      }

      // Send SMS
      if (prefs.sms !== false && user.phone) {
        await sendSms({ to: user.phone, message });
        smsSent++;
      }

      // Send WhatsApp
      if (prefs.whatsapp === true && user.phone) {
        await sendWhatsApp({ to: user.phone, message });
      }
    }

    return NextResponse.json({ checked: tasks.length, smsSent });
  } catch (err) {
    console.error("SLA warning cron error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
