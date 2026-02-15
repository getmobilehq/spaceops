"use client";

import type { InspectorPerformance } from "@/lib/utils/analytics-queries";

interface InspectorTableProps {
  data: InspectorPerformance[];
}

function getRankStyle(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-amber-100 text-amber-700";
    case 2:
      return "bg-slate-100 text-slate-500";
    case 3:
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-slate-50 text-slate-400";
  }
}

function getPassRateColor(rate: number): string {
  if (rate >= 90) return "bg-pass-bg text-pass border border-pass-border";
  if (rate >= 70) return "bg-warning-bg text-warning border border-warning-border";
  return "bg-fail-bg text-fail border border-fail-border";
}

export function InspectorTable({ data }: InspectorTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200">
        <p className="text-caption text-slate-400">No inspector data</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((inspector, index) => (
        <div
          key={inspector.userId}
          className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-slate-50"
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${getRankStyle(index + 1)}`}
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {inspector.inspectorName}
            </p>
          </div>
          <span className="shrink-0 font-mono text-caption text-slate-500">
            {inspector.inspectionCount} insp
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPassRateColor(inspector.avgPassRate)}`}
          >
            {inspector.avgPassRate}%
          </span>
          <span className="shrink-0 text-caption text-slate-400">
            {inspector.avgDurationMinutes}m avg
          </span>
        </div>
      ))}
    </div>
  );
}
