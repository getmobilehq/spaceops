import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuditContextAdmin } from "@/lib/utils/audit";
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
    await setAuditContextAdmin(supabase, null);
    const now = new Date();

    // Find overdue tasks
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .in("status", ["open", "in_progress"])
      .not("due_date", "is", null)
      .lt("due_date", now.toISOString());

    const tasks = (tasksData ?? []) as unknown as Task[];
    let notified = 0;

    for (const task of tasks) {
      if (!task.due_date) continue;

      // Check if overdue notification already sent for this task in last hour
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", task.created_by)
        .eq("type", "overdue")
        .gte(
          "created_at",
          new Date(now.getTime() - 60 * 60 * 1000).toISOString()
        )
        .ilike("link", `%${task.id}%`);

      if ((count ?? 0) > 0) continue;

      // Fetch space name
      const { data: spaceData } = await supabase
        .from("spaces")
        .select("name")
        .eq("id", task.space_id)
        .single();

      const spaceName =
        (spaceData as unknown as { name: string } | null)?.name ?? "Unknown";

      const daysOverdue = Math.floor(
        (now.getTime() - new Date(task.due_date).getTime()) / 86400000
      );
      const message = `SpaceOps: Task in ${spaceName} is ${
        daysOverdue > 0 ? daysOverdue + "d" : "<1d"
      } overdue — "${task.description.slice(0, 60)}"`;

      // Notify task creator (supervisor)
      await createNotification({
        userId: task.created_by,
        type: "overdue",
        message,
        link: `/tasks#${task.id}`,
      });

      // Also notify assignee if different from creator
      if (task.assigned_to && task.assigned_to !== task.created_by) {
        // Check dedup for assignee too
        const { count: assigneeCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", task.assigned_to)
          .eq("type", "overdue")
          .gte(
            "created_at",
            new Date(now.getTime() - 60 * 60 * 1000).toISOString()
          )
          .ilike("link", `%${task.id}%`);

        if ((assigneeCount ?? 0) === 0) {
          await createNotification({
            userId: task.assigned_to,
            type: "overdue",
            message,
            link: `/tasks#${task.id}`,
          });

          // SMS to assignee
          const { data: assigneeData } = await supabase
            .from("users")
            .select("*")
            .eq("id", task.assigned_to)
            .single();

          const assignee = assigneeData as unknown as UserProfile | null;
          if (assignee) {
            const prefs = (assignee.notification_prefs ?? {}) as {
              sms?: boolean;
              whatsapp?: boolean;
            };
            if (prefs.sms !== false && assignee.phone) {
              await sendSms({ to: assignee.phone, message });
            }
            if (prefs.whatsapp === true && assignee.phone) {
              await sendWhatsApp({ to: assignee.phone, message });
            }
          }
        }
      }

      notified++;
    }

    return NextResponse.json({ overdue: tasks.length, notified });
  } catch (err) {
    console.error("Overdue check cron error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
