export default function AuditLogLoading() {
  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}
