export default function Loading() {
  return (
    <div className="p-4">
      <div className="mb-6 space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
