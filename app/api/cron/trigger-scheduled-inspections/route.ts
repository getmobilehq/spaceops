import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuditContextAdmin } from "@/lib/utils/audit";
import { sendSms, sendWhatsApp } from "@/lib/utils/sms";
import { createNotification } from "@/lib/utils/notifications";
import type { InspectionSchedule, UserProfile, Building } from "@/lib/types/helpers";

/**
 * Calculate the next due date based on frequency.
 */
function calculateNextDue(schedule: InspectionSchedule): string {
  const now = new Date();
  const [hours, minutes] = schedule.time_of_day.split(":").map(Number);

  let next: Date;

  switch (schedule.frequency) {
    case "daily": {
      next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes);
      break;
    }
    case "weekly": {
      const dayOfWeek = schedule.day_of_week ?? 1; // Default Monday
      next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      const daysUntilNext = ((dayOfWeek - now.getDay() + 7) % 7) || 7;
      next.setDate(now.getDate() + daysUntilNext);
      break;
    }
    case "biweekly": {
      const dayOfWeek2 = schedule.day_of_week ?? 1;
      next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      const daysUntil = ((dayOfWeek2 - now.getDay() + 7) % 7) || 7;
      // Add 14 days instead of 7 for biweekly
      next.setDate(now.getDate() + daysUntil + 7);
      break;
    }
    case "monthly": {
      const dayOfMonth = schedule.day_of_month ?? 1;
      let month = now.getMonth() + 1;
      let year = now.getFullYear();
      if (month > 11) {
        month = 0;
        year++;
      }
      next = new Date(year, month, dayOfMonth, hours, minutes);
      break;
    }
    default:
      next = new Date(now.getTime() + 86400000);
  }

  return next.toISOString();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    await setAuditContextAdmin(supabase, null);
    const now = new Date();

    // Find schedules that are due
    const { data: schedulesData } = await supabase
      .from("inspection_schedules")
      .select("*")
      .eq("enabled", true)
      .lte("next_due_at", now.toISOString());

    const schedules = (schedulesData ?? []) as unknown as InspectionSchedule[];
    let notified = 0;

    for (const schedule of schedules) {
      // Get building info
      const { data: buildingData } = await supabase
        .from("buildings")
        .select("id, name, archived")
        .eq("id", schedule.building_id)
        .single();

      const building = buildingData as unknown as Pick<Building, "id" | "name" | "archived"> | null;
      if (!building || building.archived) {
        // Skip archived buildings, update next_due_at to skip
        const nextDue = calculateNextDue(schedule);
        await supabase
          .from("inspection_schedules")
          .update({ next_due_at: nextDue, last_triggered_at: now.toISOString(), updated_at: now.toISOString() })
          .eq("id", schedule.id);
        continue;
      }

      // Get spaces count for context
      const { count: spaceCount } = await supabase
        .from("spaces")
        .select("*", { count: "exact", head: true })
        .in(
          "floor_id",
          (
            await supabase
              .from("floors")
              .select("id")
              .eq("building_id", building.id)
          ).data?.map((f: { id: string }) => f.id) ?? []
        )
        .is("deleted_at", null);

      const message = `SpaceOps: Inspection scheduled for ${building.name} (${spaceCount ?? 0} spaces). Please begin inspections.`;

      // Notify assigned user
      if (schedule.assigned_to) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", schedule.assigned_to)
          .single();

        const user = userData as unknown as UserProfile | null;
        if (user) {
          const prefs = (user.notification_prefs ?? {}) as {
            sms?: boolean;
            in_app?: boolean;
            whatsapp?: boolean;
          };

          // In-app notification
          if (prefs.in_app !== false) {
            await createNotification({
              userId: user.id,
              type: "inspection_scheduled",
              message,
              link: `/buildings/${building.id}`,
            });
          }

          // SMS
          if (prefs.sms !== false && user.phone) {
            await sendSms({ to: user.phone, message });
          }

          // WhatsApp
          if (prefs.whatsapp === true && user.phone) {
            await sendWhatsApp({ to: user.phone, message });
          }

          notified++;
        }
      } else {
        // No specific assignee — notify all supervisors assigned to this building
        const { data: assignmentsData } = await supabase
          .from("building_assignments")
          .select("user_id")
          .eq("building_id", building.id);

        const userIds = (assignmentsData ?? []).map((a: { user_id: string }) => a.user_id);

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from("users")
            .select("*")
            .in("id", userIds)
            .in("role", ["admin", "supervisor"]);

          const users = (usersData ?? []) as unknown as UserProfile[];
          for (const user of users) {
            const prefs = (user.notification_prefs ?? {}) as {
              sms?: boolean;
              in_app?: boolean;
              whatsapp?: boolean;
            };

            if (prefs.in_app !== false) {
              await createNotification({
                userId: user.id,
                type: "inspection_scheduled",
                message,
                link: `/buildings/${building.id}`,
              });
            }

            if (prefs.sms !== false && user.phone) {
              await sendSms({ to: user.phone, message });
            }

            if (prefs.whatsapp === true && user.phone) {
              await sendWhatsApp({ to: user.phone, message });
            }
          }
          notified += users.length;
        }
      }

      // Update schedule: set next_due_at and last_triggered_at
      const nextDue = calculateNextDue(schedule);
      await supabase
        .from("inspection_schedules")
        .update({
          next_due_at: nextDue,
          last_triggered_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", schedule.id);
    }

    return NextResponse.json({ checked: schedules.length, notified });
  } catch (err) {
    console.error("Inspection scheduling cron error:", err);
    Sentry.captureException(err, { tags: { context: "cron" } });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
