export default function MoreLoading() {
  return (
    <div className="animate-pulse p-4">
      {/* User info skeleton */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-slate-200" />
        <div>
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-1.5 h-3 w-20 rounded bg-slate-200" />
        </div>
      </div>

      {/* Section 1 */}
      <div className="mb-2 h-3 w-28 rounded bg-slate-200" />
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-5 w-5 rounded bg-slate-200" />
            <div className="h-4 flex-1 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Section 2 */}
      <div className="mb-2 mt-6 h-3 w-24 rounded bg-slate-200" />
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-5 w-5 rounded bg-slate-200" />
            <div className="h-4 flex-1 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Section 3 */}
      <div className="mb-2 mt-6 h-3 w-20 rounded bg-slate-200" />
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-5 w-5 rounded bg-slate-200" />
            <div className="h-4 flex-1 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
