import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuditContextAdmin } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    await setAuditContextAdmin(supabase, null);

    // 1. Hard-delete spaces where deleted_at > 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: purgedSpaces } = await supabase
      .from("spaces")
      .delete()
      .lt("deleted_at", thirtyDaysAgo.toISOString())
      .not("deleted_at", "is", null)
      .select("id");

    const purgedCount = purgedSpaces?.length ?? 0;

    // 2. Expire in-progress inspections older than 4 hours
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    const { data: expiredInspections } = await supabase
      .from("inspections")
      .update({ status: "expired" })
      .eq("status", "in_progress")
      .lt("started_at", fourHoursAgo.toISOString())
      .select("id");

    const expiredCount = expiredInspections?.length ?? 0;

    return NextResponse.json({
      purgedSpaces: purgedCount,
      expiredInspections: expiredCount,
    });
  } catch (err) {
    console.error("Cleanup cron error:", err);
    Sentry.captureException(err, { tags: { context: "cron" } });
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
