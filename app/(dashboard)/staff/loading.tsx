export default function StaffLoading() {
  return (
    <div className="p-4 lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <div className="mb-6">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
