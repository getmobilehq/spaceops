"use client";

import { useRouter } from "next/navigation";
import type { SpaceWithStatus, SpaceStatus } from "@/lib/utils/space-status";
import { STATUS_LABELS } from "@/lib/utils/space-status";
import { FloorPlanUpload } from "./floor-plan-upload";
import { MapPin, ChevronRight } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

interface SpaceListFallbackProps {
  spacesWithStatus: SpaceWithStatus[];
  isAdmin: boolean;
  floorId: string;
  buildingId: string;
  orgId: string;
}

const statusDot: Record<SpaceStatus, string> = {
  green: "bg-pin-green",
  amber: "bg-pin-amber",
  red: "bg-pin-red",
  grey: "bg-pin-grey",
};

export function SpaceListFallback({
  spacesWithStatus,
  isAdmin,
  floorId,
  buildingId,
  orgId,
}: SpaceListFallbackProps) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Upload prompt for admin */}
      {isAdmin && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            Upload a floor plan to enable the visual map view
          </div>
          <FloorPlanUpload
            floorId={floorId}
            buildingId={buildingId}
            orgId={orgId}
          />
        </div>
      )}

      {/* Space list */}
      {spacesWithStatus.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm-body text-slate-400">
            No spaces on this floor yet
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {spacesWithStatus.map((space) => (
            <button
              key={space.spaceId}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              onClick={() => router.push(`/inspect/${space.spaceId}`)}
            >
              <div
                className={`h-3 w-3 shrink-0 rounded-full ${statusDot[space.status]}`}
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-body font-medium text-slate-900">
                  {space.spaceName}
                </p>
                <p className="text-caption text-slate-400">
                  {STATUS_LABELS[space.status]}
                  {space.lastInspectedAt
                    ? ` · ${formatRelativeTime(space.lastInspectedAt)}`
                    : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
