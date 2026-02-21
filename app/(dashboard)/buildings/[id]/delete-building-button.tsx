"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
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

interface DeleteBuildingButtonProps {
  buildingId: string;
  buildingName: string;
}

export function DeleteBuildingButton({
  buildingId,
  buildingName,
}: DeleteBuildingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createBrowserSupabaseClient();

    try {
      // 1. Get floors for this building
      const { data: floors } = await supabase
        .from("floors")
        .select("id")
        .eq("building_id", buildingId);
      const floorIds = (floors ?? []).map((f: { id: string }) => f.id);

      // 2. Get spaces for these floors
      let spaceIds: string[] = [];
      if (floorIds.length > 0) {
        const { data: spaces } = await supabase
          .from("spaces")
          .select("id")
          .in("floor_id", floorIds);
        spaceIds = (spaces ?? []).map((s: { id: string }) => s.id);
      }

      // 3. Cascade through space-linked records
      if (spaceIds.length > 0) {
        // Get inspections
        const { data: inspections } = await supabase
          .from("inspections")
          .select("id")
          .in("space_id", spaceIds);
        const inspectionIds = (inspections ?? []).map((i: { id: string }) => i.id);

        if (inspectionIds.length > 0) {
          // Get inspection responses
          const { data: responses } = await supabase
            .from("inspection_responses")
            .select("id")
            .in("inspection_id", inspectionIds);
          const responseIds = (responses ?? []).map((r: { id: string }) => r.id);

          // Delete response photos
          if (responseIds.length > 0) {
            await supabase
              .from("response_photos")
              .delete()
              .in("response_id", responseIds);
          }

          // Get deficiencies (linked to responses)
          if (responseIds.length > 0) {
            const { data: deficiencies } = await supabase
              .from("deficiencies")
              .select("id")
              .in("response_id", responseIds);
            const deficiencyIds = (deficiencies ?? []).map((d: { id: string }) => d.id);

            // Delete tasks linked to deficiencies
            if (deficiencyIds.length > 0) {
              await supabase
                .from("tasks")
                .delete()
                .in("deficiency_id", deficiencyIds);

              // Delete deficiencies
              await supabase
                .from("deficiencies")
                .delete()
                .in("id", deficiencyIds);
            }
          }

          // Delete inspection responses
          await supabase
            .from("inspection_responses")
            .delete()
            .in("inspection_id", inspectionIds);

          // Delete inspections
          await supabase
            .from("inspections")
            .delete()
            .in("id", inspectionIds);
        }

        // Delete manual tasks (not linked to deficiencies) for these spaces
        await supabase.from("tasks").delete().in("space_id", spaceIds);

        // Delete QR codes
        await supabase.from("qr_codes").delete().in("space_id", spaceIds);

        // Delete spaces
        await supabase.from("spaces").delete().in("id", spaceIds);
      }

      // 4. Delete floor plans and floors
      if (floorIds.length > 0) {
        await supabase.from("floor_plans").delete().in("floor_id", floorIds);
        await supabase.from("floors").delete().in("id", floorIds);
      }

      // 5. Delete building-level records
      await supabase
        .from("building_assignments")
        .delete()
        .eq("building_id", buildingId);
      await supabase
        .from("client_building_links")
        .delete()
        .eq("building_id", buildingId);
      await supabase
        .from("shared_dashboards")
        .delete()
        .eq("building_id", buildingId);
      await supabase
        .from("report_configs")
        .delete()
        .eq("building_id", buildingId);

      // 6. Delete the building
      const { error } = await supabase
        .from("buildings")
        .delete()
        .eq("id", buildingId);

      if (error) {
        toast.error("Failed to delete building");
      } else {
        toast.success(`"${buildingName}" permanently deleted`);
        setOpen(false);
        router.push("/buildings");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete building");
    }

    setDeleting(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-fail"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => !deleting && setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Building</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{buildingName}&rdquo; and all
              its floors, spaces, inspections, deficiencies, and tasks. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-fail text-white hover:bg-fail/90"
            >
              {deleting && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
