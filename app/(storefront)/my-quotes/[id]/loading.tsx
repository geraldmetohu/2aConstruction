// Shown instantly while a client's project page loads.
export default function ProjectLoading() {
  return (
    <main role="status" aria-label="Loading your project" className="mx-auto max-w-6xl animate-pulse space-y-5 px-4 py-10">
      <div className="h-8 w-72 rounded-lg bg-neutral-200" />
      <div className="h-4 w-96 max-w-full rounded bg-neutral-200/70" />
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-neutral-200/70" />)}</div>
      <div className="h-72 rounded-2xl bg-neutral-200/60" />
      <span className="sr-only">Loading…</span>
    </main>
  );
}
