export default function Loading() {
  return (
    <div className="p-4">
      <div className="mb-4 h-7 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mb-4 flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-full bg-slate-100"
          />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-slate-100 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
