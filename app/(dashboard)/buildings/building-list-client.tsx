"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-3">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreBuilding(building.id)}
                  >
                    <RotateCcw className="mr-1.5 h-3 w-3" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
