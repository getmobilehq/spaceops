export default function Loading() {
  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
            <div className="mt-1 h-3 w-32 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
