"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, Archive, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatSqft } from "@/lib/utils/format";
import type { Building } from "@/lib/types/helpers";

interface BuildingListClientProps {
  buildings: Building[];
  archivedBuildings: Building[];
  isAdmin: boolean;
}

export function BuildingListClient({
  buildings,
  archivedBuildings,
  isAdmin,
}: BuildingListClientProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Building | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteBuilding() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createBrowserSupabaseClient();
    const buildingId = deleteTarget.id;

    try {
      // Get floors
      const { data: floors } = await supabase
        .from("floors")
        .select("id")
        .eq("building_id", buildingId);
      const floorIds = (floors ?? []).map((f: { id: string }) => f.id);

      // Get spaces
      let spaceIds: string[] = [];
      if (floorIds.length > 0) {
        const { data: spaces } = await supabase
          .from("spaces")
          .select("id")
          .in("floor_id", floorIds);
        spaceIds = (spaces ?? []).map((s: { id: string }) => s.id);
      }

      // Cascade space records
      if (spaceIds.length > 0) {
        const { data: inspections } = await supabase
          .from("inspections")
          .select("id")
          .in("space_id", spaceIds);
        const inspectionIds = (inspections ?? []).map((i: { id: string }) => i.id);

        if (inspectionIds.length > 0) {
          const { data: responses } = await supabase
            .from("inspection_responses")
            .select("id")
            .in("inspection_id", inspectionIds);
          const responseIds = (responses ?? []).map((r: { id: string }) => r.id);

          if (responseIds.length > 0) {
            await supabase.from("response_photos").delete().in("response_id", responseIds);
            const { data: deficiencies } = await supabase
              .from("deficiencies")
              .select("id")
              .in("response_id", responseIds);
            const deficiencyIds = (deficiencies ?? []).map((d: { id: string }) => d.id);
            if (deficiencyIds.length > 0) {
              await supabase.from("tasks").delete().in("deficiency_id", deficiencyIds);
              await supabase.from("deficiencies").delete().in("id", deficiencyIds);
            }
          }

          await supabase.from("inspection_responses").delete().in("inspection_id", inspectionIds);
          await supabase.from("inspections").delete().in("id", inspectionIds);
        }

        await supabase.from("tasks").delete().in("space_id", spaceIds);
        await supabase.from("qr_codes").delete().in("space_id", spaceIds);
        await supabase.from("spaces").delete().in("id", spaceIds);
      }

      if (floorIds.length > 0) {
        await supabase.from("floor_plans").delete().in("floor_id", floorIds);
        await supabase.from("floors").delete().in("id", floorIds);
      }

      await supabase.from("building_assignments").delete().eq("building_id", buildingId);
      await supabase.from("client_building_links").delete().eq("building_id", buildingId);
      await supabase.from("shared_dashboards").delete().eq("building_id", buildingId);
      await supabase.from("report_configs").delete().eq("building_id", buildingId);

      const { error } = await supabase.from("buildings").delete().eq("id", buildingId);

      if (error) {
        toast.error("Failed to delete building");
      } else {
        toast.success(`"${deleteTarget.name}" permanently deleted`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete building");
    }

    setDeleteTarget(null);
    setDeleting(false);
  }

  async function restoreBuilding(buildingId: string) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("buildings")
      .update({ archived: false })
      .eq("id", buildingId);

    if (error) {
      toast.error("Failed to restore building");
      return;
    }

    toast.success("Building restored");
    router.refresh();
  }

  if (buildings.length === 0 && !showArchived) {
    return (
      <div>
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-h3 text-slate-700">No buildings yet</p>
          <p className="text-sm-body mt-1 text-slate-500">
            Add your first building to get started
          </p>
        </div>
        {isAdmin && archivedBuildings.length > 0 && (
          <button
            onClick={() => setShowArchived(true)}
            className="mt-3 text-caption text-slate-400 hover:text-slate-600"
          >
            Show {archivedBuildings.length} archived
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {buildings.map((building) => (
          <Link key={building.id} href={`/buildings/${building.id}`}>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-h3 text-slate-900">{building.name}</h3>
                  {(building.street || building.city) && (
                    <div className="mt-1 flex items-center gap-1 text-sm-body text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {[building.street, building.city, building.state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                {building.sqft && (
                  <span className="text-caption text-slate-400">
                    {formatSqft(building.sqft)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Archive toggle and archived buildings */}
      {isAdmin && archivedBuildings.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-1.5 text-caption text-slate-400 hover:text-slate-600"
          >
            <Archive className="h-3 w-3" />
            {showArchived ? "Hide" : "Show"} {archivedBuildings.length} archived
          </button>

          {showArchived && (
            <div className="mt-3 space-y-2">
              {archivedBuildings.map((building) => (
                <div
                  key={building.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 opacity-60"
                >
                  <div>
                    <h3 className="text-h3 text-slate-500 line-through">
                      {building.name}
                    </h3>
                    {building.city && (
                      <p className="text-caption text-slate-400">{building.city}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreBuilding(building.id)}
                    >
                      <RotateCcw className="mr-1.5 h-3 w-3" />
                      Restore
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(building)}
                      className="text-fail hover:text-fail"
                    >
                      <Trash2 className="mr-1.5 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !deleting && (!v && setDeleteTarget(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Building</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo; and
              all its floors, spaces, inspections, deficiencies, and tasks. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBuilding}
              disabled={deleting}
              className="bg-fail text-white hover:bg-fail/90"
            >
              {deleting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
