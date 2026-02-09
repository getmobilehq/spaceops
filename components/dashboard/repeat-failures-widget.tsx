import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export interface RepeatFailure {
  spaceName: string;
  buildingName: string;
  itemDescription: string;
  count: number;
  spaceId: string;
}

interface RepeatFailuresWidgetProps {
  failures: RepeatFailure[];
}

export function RepeatFailuresWidget({ failures }: RepeatFailuresWidgetProps) {
  if (failures.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <h3 className="text-h3 text-slate-900">Repeat Failures</h3>
      </div>
      <div className="space-y-2">
        {failures.slice(0, 5).map((f, i) => (
          <Link
            key={i}
            href={`/inspect/${f.spaceId}`}
            className="flex items-start justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-slate-900">
                {f.spaceName}
              </p>
              <p className="truncate text-caption text-slate-400">
                {f.buildingName} &middot; {f.itemDescription}
              </p>
            </div>
            <span className="ml-2 shrink-0 rounded-full bg-fail-bg px-2 py-0.5 text-[11px] font-semibold text-fail">
              {f.count}x
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
