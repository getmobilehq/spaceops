import { Trophy } from "lucide-react";

export interface LeaderboardInspector {
  inspectorName: string;
  inspectionCount: number;
  avgPassRate: number | null;
}

interface InspectorLeaderboardProps {
  inspectors: LeaderboardInspector[];
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-slate-200 text-slate-600",
  3: "bg-orange-100 text-orange-700",
};

export function InspectorLeaderboard({ inspectors }: InspectorLeaderboardProps) {
  if (inspectors.length === 0) return null;

  const top5 = inspectors.slice(0, 5);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h3 className="text-h3 text-slate-900">Top Inspectors</h3>
      </div>
      <div className="space-y-2">
        {top5.map((inspector, i) => {
          const rank = i + 1;
          const rankClass = RANK_STYLES[rank] ?? "bg-slate-100 text-slate-500";

          return (
            <div
              key={inspector.inspectorName}
              className="flex items-center gap-3 rounded-md px-2 py-1.5"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${rankClass}`}
              >
                {rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-slate-900">
                  {inspector.inspectorName}
                </p>
              </div>
              <span className="shrink-0 font-mono text-caption text-slate-500">
                {inspector.inspectionCount}
              </span>
              {inspector.avgPassRate !== null && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    inspector.avgPassRate >= 90
                      ? "bg-pass-bg text-pass"
                      : inspector.avgPassRate >= 70
                        ? "bg-warning-bg text-warning"
                        : "bg-fail-bg text-fail"
                  }`}
                >
                  {inspector.avgPassRate}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
