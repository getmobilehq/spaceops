interface CompletionBarProps {
  completed: number;
  total: number;
  label?: string;
}

export function CompletionBar({ completed, total, label }: CompletionBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-caption text-slate-400">{label}</span>
          <span className="text-caption font-semibold text-slate-600">
            {completed}/{total}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-primary-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
