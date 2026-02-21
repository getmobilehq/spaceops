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
      <div className="rounded-lg bg-white p-4 ring-1 ring-slate-200/60 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
              <Building2 className="h-5 w-5 text-primary-600" />
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
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
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
