"use client";

import Link from "next/link";
import type { Floor } from "@/lib/types/helpers";

interface FloorSelectorProps {
  floors: Floor[];
  currentFloorId: string;
  buildingId: string;
}

export function FloorSelector({
  floors,
  currentFloorId,
  buildingId,
}: FloorSelectorProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2">
      {floors.map((floor) => {
        const isActive = floor.id === currentFloorId;
        return (
          <Link
            key={floor.id}
            href={`/buildings/${buildingId}/map/${floor.id}`}
            className={`shrink-0 rounded-md px-3 py-1.5 text-caption transition-colors ${
              isActive
                ? "bg-primary-100 font-semibold text-primary-700"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {floor.name}
          </Link>
        );
      })}
    </div>
  );
}
