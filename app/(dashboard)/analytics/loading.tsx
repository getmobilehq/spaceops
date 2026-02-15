export default function AnalyticsLoading() {
  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-6">
        <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-48 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
