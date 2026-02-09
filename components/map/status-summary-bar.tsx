"use client";

import type { SpaceWithStatus, SpaceStatus } from "@/lib/utils/space-status";
import { STATUS_LABELS } from "@/lib/utils/space-status";

interface StatusSummaryBarProps {
  spacesWithStatus: SpaceWithStatus[];
}

const dotColors: Record<SpaceStatus, string> = {
  green: "bg-pin-green",
  amber: "bg-pin-amber",
  red: "bg-pin-red",
  grey: "bg-pin-grey",
};

export function StatusSummaryBar({ spacesWithStatus }: StatusSummaryBarProps) {
  const counts: Record<SpaceStatus, number> = { green: 0, amber: 0, red: 0, grey: 0 };

  for (const s of spacesWithStatus) {
    counts[s.status]++;
  }

  const statuses: SpaceStatus[] = ["green", "amber", "red", "grey"];

  return (
    <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2">
      <span className="text-caption text-slate-400">
        {spacesWithStatus.length} space{spacesWithStatus.length !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-3">
        {statuses.map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${dotColors[status]}`} />
            <span className="text-caption text-slate-600">
              {counts[status]} {STATUS_LABELS[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
