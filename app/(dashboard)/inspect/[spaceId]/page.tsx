import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle2, AlertTriangle, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type {
  Space,
  Floor,
  Building,
  UserProfile,
  Inspection,
  ChecklistTemplate,
} from "@/lib/types/helpers";
import { formatRelativeTime } from "@/lib/utils/format";
import { getRecentInspections } from "@/lib/utils/dashboard-queries";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
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

  // Get space with floor info
  const { data: spaceData } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", spaceId)
    .is("deleted_at", null)
    .single();

  const space = spaceData as unknown as Space | null;
  if (!space) notFound();

  // Get floor and building
  const { data: floorData } = await supabase
    .from("floors")
    .select("*")
    .eq("id", space.floor_id)
    .single();

  const floor = floorData as unknown as Floor | null;

  let building: Building | null = null;
  if (floor) {
    const { data: buildingData } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", floor.building_id)
      .single();
    building = buildingData as unknown as Building | null;
  }

  // Get assigned checklist template
  let template: ChecklistTemplate | null = null;
  if (space.checklist_template_id) {
    const { data: templateData } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("id", space.checklist_template_id)
      .single();
    template = templateData as unknown as ChecklistTemplate | null;
  }

  // Get last inspection
  const { data: lastInspectionData } = await supabase
    .from("inspections")
    .select("*")
    .eq("space_id", spaceId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastInspection = lastInspectionData as unknown as Inspection | null;

  // Check if there's an in-progress inspection by this user
  const { data: activeInspectionData } = await supabase
    .from("inspections")
    .select("*")
    .eq("space_id", spaceId)
    .eq("inspector_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  const activeInspection = activeInspectionData as unknown as Inspection | null;

  // Fetch recent inspection history for this space
  const recentInspections = await getRecentInspections(supabase, [spaceId], 10);

  // Determine which inspections are editable (within 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  return (
    <div className="p-4">
      {building && (
        <Link
          href={`/buildings/${building.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm-body text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {building.name}
        </Link>
      )}

      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">{space.name}</h1>
        <p className="mt-1 text-sm-body text-slate-500">
          {floor?.name}
          {building ? ` · ${building.name}` : ""}
        </p>
      </div>

      {/* Last inspection info */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-caption mb-3 font-semibold uppercase tracking-wide text-slate-500">
          Last Inspection
        </h2>
        {lastInspection ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-pass" />
            <div>
              <p className="text-body text-slate-700">Completed</p>
              <p className="text-caption text-slate-500">
                {formatRelativeTime(lastInspection.completed_at!)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-slate-300" />
            <p className="text-body text-slate-500">Never inspected</p>
          </div>
        )}
      </div>

      {/* Checklist info */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-caption mb-3 font-semibold uppercase tracking-wide text-slate-500">
          Assigned Checklist
        </h2>
        {template ? (
          <p className="text-body text-slate-700">{template.name}</p>
        ) : (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-body text-slate-500">
              No checklist assigned to this space
            </p>
          </div>
        )}
      </div>

      {/* Action button */}
      {template ? (
        activeInspection ? (
          <Link href={`/inspect/${spaceId}/checklist`}>
            <Button className="w-full bg-warning font-semibold text-white hover:bg-amber-600">
              <Clock className="mr-2 h-4 w-4" />
              Resume Inspection
            </Button>
          </Link>
        ) : (
          <Link href={`/inspect/${spaceId}/checklist`}>
            <Button className="w-full bg-primary-600 font-semibold text-white hover:bg-primary-700">
              Start Inspection
            </Button>
          </Link>
        )
      ) : (
        <p className="text-center text-sm-body text-slate-400">
          Assign a checklist template to start inspecting
        </p>
      )}

      {/* Inspection History */}
      {recentInspections.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-400" />
              <h2 className="text-h2 text-slate-900">Inspection History</h2>
            </div>
            {building && (
              <Link href={`/buildings/${building.id}/inspections`}>
                <span className="text-caption font-semibold text-primary-600 hover:text-primary-700">
                  View All
                </span>
              </Link>
            )}
          </div>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {recentInspections.map((insp) => {
              const total = insp.passCount + insp.failCount;
              const isEditable =
                new Date(insp.completedAt) > threeMonthsAgo &&
                (profile.role === "admin" || profile.id === insp.inspectorName);

              return (
                <div
                  key={insp.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-slate-700">
                      {insp.inspectorName}
                    </p>
                    <p className="text-caption text-slate-400">
                      {formatRelativeTime(insp.completedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {total > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          insp.failCount === 0
                            ? "bg-pass-bg text-pass"
                            : "bg-fail-bg text-fail"
                        }`}
                      >
                        {insp.passCount}/{total}
                      </span>
                    )}
                    {isEditable && (
                      <Link href={`/inspect/${spaceId}/checklist?edit=${insp.id}`}>
                        <span className="text-caption font-semibold text-primary-600 hover:text-primary-700">
                          Edit
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
