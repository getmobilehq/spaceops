import type { DeficiencyStatus, TaskStatus, InspectionStatus } from "@/lib/types/database";

type StatusType = DeficiencyStatus | TaskStatus | InspectionStatus | string;

const colorMap: Record<string, string> = {
  open: "bg-fail-bg text-fail border border-fail-border",
  in_progress: "bg-warning-bg text-warning border border-warning-border",
  closed: "bg-pass-bg text-pass border border-pass-border",
  completed: "bg-pass-bg text-pass border border-pass-border",
  expired: "bg-slate-100 text-slate-500",
};

const labelMap: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  completed: "Completed",
  expired: "Expired",
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colors = colorMap[status] || "bg-slate-100 text-slate-600";
  const label = labelMap[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${colors} ${className}`}
    >
      {label}
    </span>
  );
}
