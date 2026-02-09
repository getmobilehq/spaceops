import type { TaskPriority } from "@/lib/types/database";

const colorMap: Record<TaskPriority, string> = {
  critical: "bg-fail-bg text-fail border border-fail-border",
  high: "bg-orange-50 text-orange-600 border border-orange-200",
  medium: "bg-warning-bg text-warning border border-warning-border",
  low: "bg-slate-100 text-slate-500",
};

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const colors = colorMap[priority];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${colors} ${className}`}
    >
      {priority}
    </span>
  );
}
