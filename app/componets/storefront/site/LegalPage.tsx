import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalSection { id: string; title: string; body: ReactNode }

/** Plain, readable layout for policies: contents on the left, text on the right. */
export function LegalPage({ title, intro, updated, sections }: { title: string; intro: ReactNode; updated: string; sections: LegalSection[] }) {
  return (
    <div className="bg-white text-[#071a33]">
      <header className="border-b-2 border-[#071a33] bg-[#eef1f4]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20 lg:px-10">
          <nav aria-label="Breadcrumb" className="text-sm text-[#071a33]/55"><Link href="/" className="hover:text-[#071a33]">Home</Link> / <span className="text-[#071a33]">{title}</span></nav>
          <h1 className="mt-5 text-4xl font-semibold leading-[1] tracking-[-0.03em] md:text-6xl">{title}</h1>
          <div className="mt-5 max-w-2xl text-lg leading-relaxed text-[#071a33]/75">{intro}</div>
          <p className="mt-4 text-sm text-[#071a33]/55">Last updated {updated}</p>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-12 lg:px-10">
        <nav aria-label="Contents" className="lg:col-span-3">
          <ol className="space-y-2 text-sm lg:sticky lg:top-28">
            {sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="text-[#071a33]/65 hover:text-[#071a33] hover:underline">{i + 1}. {s.title}</a></li>)}
          </ol>
        </nav>
        <div className="space-y-12 lg:col-span-8 lg:col-start-5">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="text-2xl font-bold">{i + 1}. {s.title}</h2>
              <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-[#071a33]/80 [&_a]:font-semibold [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
