import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/utils/sms";
import type { Task, UserProfile } from "@/lib/types/helpers";

export async function POST(req: NextRequest) {
  try {
    // Validate caller is authenticated
    const authSupabase = await createServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { task_id, type, assigned_to } = await req.json();
    if (!task_id || !assigned_to) {
      return NextResponse.json(
        { error: "task_id and assigned_to required" },
        { status: 400 }
      );
    }

    // Use admin client for cross-user operations
    const supabase = createAdminClient();

    // Fetch task
    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    const task = taskData as unknown as Task | null;
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch assignee
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", assigned_to)
      .single();

    const assignee = userData as unknown as UserProfile | null;
    if (!assignee) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch space name for context
    const { data: spaceData } = await supabase
      .from("spaces")
      .select("name")
      .eq("id", task.space_id)
      .single();

    const spaceName =
      (spaceData as unknown as { name: string } | null)?.name ?? "Unknown";

    const message = `SpaceOps: You have been assigned a new task in ${spaceName} — "${task.description.slice(0, 80)}"`;
    const link = "/tasks";

    // Check notification preferences
    const prefs = (assignee.notification_prefs ?? {}) as {
      sms?: boolean;
      in_app?: boolean;
    };

    // Create in-app notification
    if (prefs.in_app !== false) {
      await supabase.from("notifications").insert({
        user_id: assigned_to,
        type: type ?? "task_assigned",
        message,
        link,
      });
    }

    // Send SMS if enabled and phone exists
    let smsSent = false;
    if (prefs.sms !== false && assignee.phone) {
      const result = await sendSms({ to: assignee.phone, message });
      smsSent = result.success;
    }

    return NextResponse.json({ success: true, smsSent });
  } catch (err) {
    console.error("Send SMS error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
