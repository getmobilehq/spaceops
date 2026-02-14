import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuditContextAdmin } from "@/lib/utils/audit";
import { z } from "zod";

const signupSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, name, password } = parsed.data;
    const supabase = createAdminClient();

    // 1. Look up the invitation by token
    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .eq("accepted", false)
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation link" },
        { status: 404 }
      );
    }

    const inv = invitation as unknown as {
      id: string;
      email: string;
      role: string;
      org_id: string;
      expires_at: string;
    };

    // 2. Check expiration
    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired. Please ask your admin for a new one." },
        { status: 410 }
      );
    }

    // 3. Set audit context for the admin client
    await setAuditContextAdmin(supabase, null, inv.org_id);

    // 4. Create auth user (service role bypasses email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: inv.email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // User might already exist in auth
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Try logging in instead." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // 4. Create user profile in public.users
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      org_id: inv.org_id,
      email: inv.email,
      name,
      role: inv.role as "admin" | "supervisor" | "client" | "staff",
    });

    if (profileError) {
      // Cleanup: delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // 5. Mark invitation as accepted
    await supabase
      .from("invitations")
      .update({ accepted: true })
      .eq("id", inv.id);

    return NextResponse.json({ success: true, email: inv.email });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
