import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  change?: number | null;
  changeLabel?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  change,
  changeLabel,
}: KpiCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-caption text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-kpi text-slate-900">{value}</p>
      {change != null && (
        <div className="mt-1 flex items-center gap-1">
          {change >= 0 ? (
            <TrendingUp className="h-3 w-3 text-pass" />
          ) : (
            <TrendingDown className="h-3 w-3 text-fail" />
          )}
          <span
            className={`text-caption ${change >= 0 ? "text-pass" : "text-fail"}`}
          >
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
          {changeLabel && (
            <span className="text-caption text-slate-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
