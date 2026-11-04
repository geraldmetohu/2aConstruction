import type { Metadata } from "next";
import Link from "next/link";
import { AREAS } from "@/app/lib/seo/areas";
import { ClosingCta, PageHero } from "@/app/componets/storefront/site/ui";

export const metadata: Metadata = {
  title: "Areas We Cover – Builders in London, North London & the South East",
  description: "2A Construction builds extensions, loft conversions, refurbishments and roofs across London, North London (Enfield, Barnet, Haringey, Islington, Camden, Hackney) and the South East (Hertfordshire, Essex, Kent, Surrey).",
  alternates: { canonical: "/areas" },
};

const GROUPS = ["North London", "London", "South East"] as const;

export default function AreasPage() {
  return (
    <div>
      <PageHero image="/images/roof_edmonton.jpg" title="Areas we cover"
        lead="We're based in North London and work across Greater London and the South East."
        crumbs={[{ label: "Home", href: "/" }, { label: "Areas" }]} />
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-3 lg:px-10">
        {GROUPS.map(g => (
          <div key={g}>
            <h2 className="text-2xl font-semibold tracking-tight text-[#071a33]">{g}</h2>
            <ul className="mt-5 divide-y divide-[#071a33]/10 border-y border-[#071a33]/10">
              {AREAS.filter(a => a.region === g).map(a => (
                <li key={a.slug}>
                  <Link href={`/areas/${a.slug}`} className="group flex items-center justify-between py-3.5 font-semibold text-[#071a33]">
                    {a.kind === "hub" ? `All of ${a.name}` : a.name}<span className="text-sm font-normal text-[#071a33]/50 transition-transform group-hover:translate-x-1">{a.postcodes.split(",")[0]} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <ClosingCta />
    </div>
  );
}
