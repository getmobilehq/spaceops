import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sets audit context for admin/service-role client mutations.
 * The Postgres audit_trigger() uses these session variables to record
 * who performed the action. Browser client mutations automatically
 * get auth.uid() via the trigger's COALESCE fallback.
 */
export async function setAuditContextAdmin(
  supabase: SupabaseClient,
  userId: string | null,
  orgId?: string | null
): Promise<void> {
  const { error } = await supabase.rpc("set_audit_context", {
    p_user_id: userId,
    p_org_id: orgId ?? null,
  });
  if (error) {
    console.error("Failed to set audit context:", error.message);
  }
}
