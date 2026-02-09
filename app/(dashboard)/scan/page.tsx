import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserProfile } from "@/lib/types/helpers";
import { QrScanner } from "./qr-scanner";

export default async function ScanPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as unknown as UserProfile | null;
  if (!profile) redirect("/login");

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-h1 text-slate-900">Scan QR Code</h1>
        <p className="mt-1 text-sm-body text-slate-500">
          Point your camera at a space QR code to start an inspection
        </p>
      </div>
      <QrScanner />
    </div>
  );
}
