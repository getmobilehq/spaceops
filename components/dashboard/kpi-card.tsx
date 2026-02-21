import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiAccent = "teal" | "blue" | "amber" | "red";

const accentStyles: Record<KpiAccent, { border: string; iconBg: string; iconText: string }> = {
  teal: {
    border: "border-l-primary-500",
    iconBg: "bg-primary-50",
    iconText: "text-primary-600",
  },
  blue: {
    border: "border-l-info",
    iconBg: "bg-info-bg",
    iconText: "text-info",
  },
  amber: {
    border: "border-l-warning",
    iconBg: "bg-warning-bg",
    iconText: "text-warning",
  },
  red: {
    border: "border-l-fail",
    iconBg: "bg-fail-bg",
    iconText: "text-fail",
  },
};

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: KpiAccent;
  change?: number | null;
  changeLabel?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "teal",
  change,
  changeLabel,
}: KpiCardProps) {
  const a = accentStyles[accent];

  return (
    <div
      className={cn(
        "rounded-lg border-l-[3px] bg-white p-5 ring-1 ring-slate-200/60 shadow-sm",
        a.border
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            a.iconBg
          )}
        >
          <Icon className={cn("h-4 w-4", a.iconText)} />
        </div>
        <span className="text-caption text-slate-500">{label}</span>
      </div>
      <p className="mt-3 text-kpi text-slate-900">{value}</p>
      {change != null && (
        <div className="mt-1.5 flex items-center gap-1">
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
