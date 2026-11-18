// Shown instantly while a dashboard page loads, so clicks in the menu respond straight away.
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-5 p-6">
      <div className="h-7 w-56 rounded-lg bg-neutral-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-neutral-200/70" />)}</div>
      <div className="h-64 rounded-2xl bg-neutral-200/60" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
