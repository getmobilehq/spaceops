export default function InspectionsLoading() {
  return (
    <div className="p-4">
      <div className="mb-4 h-5 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
