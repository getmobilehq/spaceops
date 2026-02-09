export default function Loading() {
  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-slate-100 bg-white"
          />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-slate-100 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
