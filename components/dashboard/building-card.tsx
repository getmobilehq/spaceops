import Link from "next/link";
import { Building2, AlertTriangle, ChevronRight } from "lucide-react";
import { CompletionBar } from "./completion-bar";

interface BuildingCardProps {
  id: string;
  name: string;
  address: string;
  passRate: number | null;
  openDeficiencyCount: number;
  inspectedToday: number;
  totalSpaces: number;
}

export function BuildingCard({
  id,
  name,
  address,
  passRate,
  openDeficiencyCount,
  inspectedToday,
  totalSpaces,
}: BuildingCardProps) {
  return (
    <Link href={`/buildings/${id}`}>
      <div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-slate-900">
                {name}
              </p>
              {address && (
                <p className="truncate text-caption text-slate-400">
                  {address}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
        </div>

        <div className="mt-3 flex items-center gap-3">
          {passRate !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                passRate >= 90
                  ? "bg-pass-bg text-pass"
                  : passRate >= 70
                    ? "bg-warning-bg text-warning"
                    : "bg-fail-bg text-fail"
              }`}
            >
              {passRate}% pass
            </span>
          )}
          {openDeficiencyCount > 0 && (
            <span className="flex items-center gap-1 text-caption text-slate-500">
              <AlertTriangle className="h-3 w-3 text-warning" />
              {openDeficiencyCount} open
            </span>
          )}
        </div>

        {totalSpaces > 0 && (
          <div className="mt-3">
            <CompletionBar
              completed={inspectedToday}
              total={totalSpaces}
              label="Inspected today"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
