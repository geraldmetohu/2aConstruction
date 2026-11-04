import Link from "next/link";
import { ArrowUpRight, Images } from "lucide-react";
import { creditLine } from "@/app/lib/portfolio/categories";
import { FullPhoto } from "./FullPhoto";
import type { PortfolioItem } from "./portfolio-data";

/**
 * A project card: the cover photograph shown in full (never cropped), then a short credit.
 * On hover the photo eases in and a "View project" bar slides up from the bottom.
 */
export function ProjectTile({ item, sizes = "(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw", light }: { item: PortfolioItem; index?: number; aspect?: string; sizes?: string; light?: boolean }) {
  const photos = item.images.length;
  return (
    <Link href={`/project/${item.id}`} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5b400]">
      <div className="relative overflow-hidden">
        {item.cover
          ? <FullPhoto src={item.cover} alt={item.name} sizes={sizes} imgClassName="transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" />
          : <div className="grid aspect-[4/3] place-items-center bg-[#e7ebf0] text-sm text-[#071a33]/50">Photographs coming soon</div>}
        <div aria-hidden className="pointer-events-none absolute inset-0 border-[3px] border-transparent transition-colors duration-500 group-hover:border-[#f5b400]" />
        <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-[#071a33] px-4 py-3 text-sm font-semibold text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0">
          <span className="inline-flex items-center gap-2">View project <ArrowUpRight className="h-4 w-4" /></span>
          {photos > 1 && <span className="inline-flex items-center gap-1.5 text-white/70"><Images className="h-4 w-4" />{photos} photos</span>}
        </div>
      </div>
      <div className="mt-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#c99400]"><span aria-hidden className="h-[3px] w-6 bg-[#f5b400]" />{item.categoryLabel}</p>
        <h3 className={`mt-2 text-xl font-semibold leading-snug tracking-[-0.01em] transition-colors md:text-[1.4rem] ${light ? "text-white" : "text-[#071a33] group-hover:text-[#0d2d57]"}`}>{item.name}</h3>
        <p className={`mt-1 text-sm ${light ? "text-white/60" : "text-neutral-500"}`}>{creditLine(item.category, item.location, item.completed)}</p>
      </div>
    </Link>
  );
}
