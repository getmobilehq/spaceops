import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  UserProfile,
  Building,
  ClientBuildingLink,
} from "@/lib/types/helpers";
import { ReportGenerator } from "./report-generator";

export default async function ReportsPage() {
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

  // Get buildings based on role
  let buildings: Building[] = [];

  if (profile.role === "client" && profile.client_org_id) {
    const { data: linksData } = await supabase
      .from("client_building_links")
      .select("building_id")
      .eq("client_org_id", profile.client_org_id);

    const buildingIds = (linksData ?? []).map(
      (l: { building_id: string }) => l.building_id
    );

    if (buildingIds.length > 0) {
      const { data: buildingsData } = await supabase
        .from("buildings")
        .select("*")
        .in("id", buildingIds)
        .order("name");
      buildings = (buildingsData ?? []) as unknown as Building[];
    }
  } else {
    const { data: buildingsData } = await supabase
      .from("buildings")
      .select("*")
      .eq("archived", false)
      .order("name");
    buildings = (buildingsData ?? []) as unknown as Building[];
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-h1 text-slate-900">Reports</h1>
      <p className="mb-6 text-sm-body text-slate-500">
        Generate inspection reports for your buildings
      </p>
      <ReportGenerator buildings={buildings} />
    </div>
  );
}
