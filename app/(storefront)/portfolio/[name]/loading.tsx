export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading projects">
      <div className="h-[60svh] animate-pulse bg-[#071a33]" />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-12 lg:px-10">
        <div className="aspect-[16/10] animate-pulse bg-neutral-200 md:col-span-8" />
        <div className="space-y-4 md:col-span-4">
          <div className="h-3 w-16 animate-pulse bg-neutral-200" />
          <div className="h-10 w-full animate-pulse bg-neutral-200" />
          <div className="h-4 w-2/3 animate-pulse bg-neutral-200" />
        </div>
        {[0, 1, 2, 3].map(i => <div key={i} className={`${i % 3 ? "aspect-[4/5] md:col-span-5" : "aspect-[4/3] md:col-span-7"} animate-pulse bg-neutral-200`} />)}
      </div>
    </div>
  );
}
