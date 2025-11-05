import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoadingRoute() {
  return (
    <div className="grid md:grid-cols-2 gap-6 items-start lg:gap-x-24 py-8">
      <div>
        <Skeleton className="w-full h-[420px] md:h-[520px] rounded-2xl" />
        <div className="grid grid-cols-5 gap-3 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-lg" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="w-72 h-10 rounded-lg" />
        <Skeleton className="w-64 h-8 mt-4 rounded-lg" />
        <Skeleton className="w-full h-40 mt-5 rounded-lg" />
        <Skeleton className="w-48 h-10 mt-6 rounded-lg" />
      </div>
    </div>
  );
}
