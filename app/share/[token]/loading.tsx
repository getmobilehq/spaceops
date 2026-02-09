export default function SharedDashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
