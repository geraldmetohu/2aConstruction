// app/(storefront)/portfolio/[name]/loading.tsx

export default function Loading() {
  return (
    <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="mt-2 h-4 w-80 rounded bg-muted" />
      </div>

      {/* Grid skeleton */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border p-3">
            <div className="h-48 w-full rounded bg-muted animate-pulse" />
            <div className="mt-3 h-5 w-2/3 rounded bg-muted animate-pulse" />
            <div className="mt-2 h-4 w-full rounded bg-muted animate-pulse" />
            <div className="mt-2 h-4 w-5/6 rounded bg-muted animate-pulse" />
            <div className="mt-4 h-10 w-full rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
