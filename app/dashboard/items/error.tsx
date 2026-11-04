"use client";
export default function CatalogueErrorPage({ reset }: { reset: () => void }) {
  return <div role="alert" className="rounded-2xl border bg-white p-8"><h2 className="text-xl font-bold">The catalogue could not be loaded</h2><p className="mt-3 text-sm text-neutral-600">Please try again. No changes are made when loading this page.</p><button onClick={reset} className="mt-5 rounded-lg bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Try again</button></div>;
}
