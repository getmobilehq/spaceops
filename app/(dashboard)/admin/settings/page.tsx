import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  Organization,
  UserProfile,
  SpaceType,
  ClientOrg,
  ClientBuildingLink,
  Building,
  ReportConfig,
} from "@/lib/types/helpers";
import { OrgSettingsForm } from "./org-settings-form";
import { SpaceTypesManager } from "./space-types-manager";
import { ClientOrgsManager } from "./client-orgs-manager";
import { ReportConfigManager } from "./report-config-manager";

export default async function AdminSettingsPage() {
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
  if (!profile || profile.role !== "admin") redirect("/");

  const { data: orgData } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  const org = orgData as unknown as Organization | null;
  if (!org) redirect("/");

  // Get space types
  const { data: customTypesData } = await supabase
    .from("space_types")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("name");

  const customTypes = (customTypesData ?? []) as unknown as SpaceType[];

  const { data: defaultTypesData } = await supabase
    .from("space_types")
    .select("*")
    .eq("is_default", true)
    .order("name");

  const defaultTypes = (defaultTypesData ?? []) as unknown as SpaceType[];

  // Get client orgs
  const { data: clientOrgsData } = await supabase
    .from("client_orgs")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("name");

  const clientOrgs = (clientOrgsData ?? []) as unknown as ClientOrg[];

  // Get client building links
  const clientOrgIds = clientOrgs.map((c) => c.id);
  let clientBuildingLinks: ClientBuildingLink[] = [];
  if (clientOrgIds.length > 0) {
    const { data: linksData } = await supabase
      .from("client_building_links")
      .select("*")
      .in("client_org_id", clientOrgIds);
    clientBuildingLinks = (linksData ?? []) as unknown as ClientBuildingLink[];
  }

  // Get buildings
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("*")
    .eq("archived", false)
    .order("name");

  const buildings = (buildingsData ?? []) as unknown as Building[];

  // Get report configs
  const buildingIds = buildings.map((b) => b.id);
  let reportConfigs: ReportConfig[] = [];
  if (buildingIds.length > 0) {
    const { data: configData } = await supabase
      .from("report_configs")
      .select("*")
      .in("building_id", buildingIds);
    reportConfigs = (configData ?? []) as unknown as ReportConfig[];
  }

  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <h1 className="text-h1 mb-6 text-slate-900">Organization Settings</h1>
      <div className="space-y-8">
        <OrgSettingsForm org={org} />
        <div className="border-t border-slate-200 pt-6">
          <SpaceTypesManager
            orgId={profile.org_id}
            customTypes={customTypes}
            defaultTypes={defaultTypes}
          />
        </div>
        <div className="border-t border-slate-200 pt-6">
          <ClientOrgsManager
            orgId={profile.org_id}
            clientOrgs={clientOrgs}
            clientBuildingLinks={clientBuildingLinks}
            buildings={buildings}
          />
        </div>
        <div className="border-t border-slate-200 pt-6">
          <ReportConfigManager
            buildings={buildings}
            reportConfigs={reportConfigs}
          />
        </div>
      </div>
    </div>
  );
}
