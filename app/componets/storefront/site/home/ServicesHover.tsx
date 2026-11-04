"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

export interface ServiceItem { slug: string; title: string; tagline: string; intro: string; image: string; count: number }

/**
 * Services as a big typographic list. Hovering (or focusing) a name swaps the photograph beside it;
 * on phones each service shows its own photo.
 */
export function ServicesHover({ items }: { items: ServiceItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <ul className="lg:col-span-6" onMouseLeave={() => undefined}>
        {items.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.slug} className="border-b-2 border-[#071a33]/10 first:border-t-2">
              <Link href={`/portfolio/${s.slug}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} className="group block py-6">
                <span className="flex items-baseline justify-between gap-4">
                  <span className={`text-3xl font-extrabold leading-none [font-stretch:118%] transition-[color,transform] duration-500 ease-out sm:text-[2.9rem] ${on ? "translate-x-3 text-[#071a33]" : "text-[#071a33]/35 group-hover:text-[#071a33]/70"}`}>{s.title}</span>
                  <span className={`flex shrink-0 items-center gap-2 text-sm font-semibold text-[#071a33] transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}>
                    {s.count > 0 ? `${s.count} project${s.count === 1 ? "" : "s"}` : "View"}<ArrowUpRight className="h-4 w-4" />
                  </span>
                </span>
                <span className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <span className="overflow-hidden">
                    <span className="mt-4 block max-w-lg pl-3 text-[17px] leading-relaxed text-[#071a33]/70">{s.tagline}</span>
                    <span className="relative mt-5 block aspect-[16/10] overflow-hidden lg:hidden"><Image src={s.image} alt="" fill sizes="100vw" className="object-cover" /></span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="relative hidden lg:col-span-6 lg:block">
        <div className="sticky top-28 aspect-[4/5] overflow-hidden bg-[#071a33]">
          {items.map((s, i) => (
            <div key={s.slug} aria-hidden className="absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ opacity: i === active ? 1 : 0, transform: i === active ? "scale(1)" : "scale(1.06)" }}>
              <Image src={s.image} alt="" fill sizes="45vw" className="object-cover" />
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#071a33]/85 to-transparent p-7 pt-24 text-white">
            <p className="max-w-md text-[17px] leading-relaxed">{items[active]?.intro}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
