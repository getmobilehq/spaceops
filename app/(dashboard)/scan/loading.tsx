export default function Loading() {
  return (
    <div className="p-4">
      <div className="mb-4 space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
