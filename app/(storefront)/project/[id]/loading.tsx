export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading project">
      <div className="h-[78svh] animate-pulse bg-[#071a33]" />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-10">
        <div className="h-4 w-24 animate-pulse bg-neutral-200 lg:col-span-3" />
        <div className="space-y-3 lg:col-span-9">
          <div className="h-8 w-full animate-pulse bg-neutral-200" />
          <div className="h-8 w-5/6 animate-pulse bg-neutral-200" />
          <div className="h-8 w-2/3 animate-pulse bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
