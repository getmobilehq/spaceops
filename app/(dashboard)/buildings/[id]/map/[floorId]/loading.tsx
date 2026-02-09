export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-6 w-32 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="flex-1 animate-pulse bg-slate-100" />
    </div>
  );
}
