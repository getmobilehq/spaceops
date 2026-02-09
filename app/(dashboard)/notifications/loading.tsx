export default function Loading() {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-7 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-slate-100 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
