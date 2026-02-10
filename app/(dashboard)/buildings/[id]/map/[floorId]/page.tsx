import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type {
  Building,
  Floor,
  FloorPlan,
  Space,
  Inspection,
  Deficiency,
  Task,
  UserProfile,
} from "@/lib/types/helpers";
import { computeSpaceStatuses } from "@/lib/utils/space-status";
import { FloorPlanViewer } from "@/components/map/floor-plan-viewer";
import { FloorPlanUpload } from "@/components/map/floor-plan-upload";
import { FloorSelector } from "@/components/map/floor-selector";
import { StatusSummaryBar } from "@/components/map/status-summary-bar";
import { SpaceListFallback } from "@/components/map/space-list-fallback";
import { RealtimeRefresh } from "@/components/map/realtime-refresh";

export default async function FloorMapPage({
  params,
}: {
  params: Promise<{ id: string; floorId: string }>;
}) {
  const { id: buildingId, floorId } = await params;
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

  // Fetch building
  const { data: buildingData } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", buildingId)
    .single();

  const building = buildingData as unknown as Building | null;
  if (!building) notFound();

  // Fetch all floors for the building (for floor selector)
  const { data: floorsData } = await supabase
    .from("floors")
    .select("*")
    .eq("building_id", buildingId)
    .order("display_order");

  const floors = (floorsData ?? []) as unknown as Floor[];
  const currentFloor = floors.find((f) => f.id === floorId);
  if (!currentFloor) notFound();

  // Fetch floor plan
  const { data: floorPlanData } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("floor_id", floorId)
    .maybeSingle();

  const floorPlan = floorPlanData as unknown as FloorPlan | null;

  // Generate signed URL for rendered image
  let signedImageUrl: string | null = null;
  if (floorPlan?.rendered_image_url) {
    const { data: signedData } = await supabase.storage
      .from("floor-plans")
      .createSignedUrl(floorPlan.rendered_image_url, 600);
    signedImageUrl = signedData?.signedUrl ?? null;
  }

  // Fetch spaces for this floor
  const { data: spacesData } = await supabase
    .from("spaces")
    .select("*")
    .eq("floor_id", floorId)
    .is("deleted_at", null)
    .order("name");

  const spaces = (spacesData ?? []) as unknown as Space[];
  const spaceIds = spaces.map((s) => s.id);

  // Fetch inspection + deficiency + task data for status computation
  let inspections: Inspection[] = [];
  let deficiencies: Deficiency[] = [];
  let tasks: Task[] = [];

  if (spaceIds.length > 0) {
    const { data: inspData } = await supabase
      .from("inspections")
      .select("*")
      .in("space_id", spaceIds)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });
    inspections = (inspData ?? []) as unknown as Inspection[];

    const { data: defData } = await supabase
      .from("deficiencies")
      .select("*")
      .in("space_id", spaceIds)
      .in("status", ["open", "in_progress"]);
    deficiencies = (defData ?? []) as unknown as Deficiency[];

    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .in("space_id", spaceIds)
      .in("status", ["open", "in_progress"]);
    tasks = (taskData ?? []) as unknown as Task[];
  }

  const spacesWithStatus = computeSpaceStatuses(
    spaces,
    inspections,
    deficiencies,
    tasks
  );

  const isAdmin = profile.role === "admin";

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <RealtimeRefresh buildingId={buildingId} spaceIds={spaceIds} />
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <Link
          href={`/buildings/${buildingId}`}
          className="mb-1 inline-flex items-center gap-1 text-sm-body text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {building.name}
        </Link>
        <h1 className="text-h2 text-slate-900">{currentFloor.name}</h1>
      </div>

      {/* Floor selector */}
      {floors.length > 1 && (
        <FloorSelector
          floors={floors}
          currentFloorId={floorId}
          buildingId={buildingId}
        />
      )}

      {/* Status summary */}
      <StatusSummaryBar spacesWithStatus={spacesWithStatus} />

      {/* Map or fallback */}
      <div className="flex-1 overflow-hidden">
        {floorPlan && signedImageUrl ? (
          <FloorPlanViewer
            signedImageUrl={signedImageUrl}
            floorPlan={floorPlan}
            spacesWithStatus={spacesWithStatus}
            isAdmin={isAdmin}
            floorId={floorId}
            buildingId={buildingId}
            orgId={profile.org_id}
          />
        ) : (
          <SpaceListFallback
            spacesWithStatus={spacesWithStatus}
            isAdmin={isAdmin}
            floorId={floorId}
            buildingId={buildingId}
            orgId={profile.org_id}
          />
        )}
      </div>
    </div>
  );
}
