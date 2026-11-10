import { Fragment, type ReactNode } from "react";
import { longDate, type DocSection, type QuoteDocs } from "@/app/lib/takeoff/documents";

export const band = (b: string) => (b === "High" ? "bg-red-100 text-red-800" : b === "Medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800");

/** A document page: letterhead, the document's title block with its reference details, and the company footer. */
export function Page({ d, title, subtitle, children, meta }: { d: QuoteDocs; title: string; subtitle?: string; children: ReactNode; meta?: [string, string][] }) {
  const c = d.company;
  const details: [string, string][] = meta ?? [["Reference", `${d.reference}${d.version > 1 ? ` · v${d.version}` : ""}`], ["Date", longDate(d.issueDate)]];
  return (
    <section className="doc-page mx-auto max-w-[210mm] break-before-page overflow-x-auto bg-white px-5 py-7 shadow-sm ring-1 ring-black/5 sm:px-12 sm:py-10 print:max-w-none print:overflow-visible print:px-0 print:py-0 print:shadow-none print:ring-0">
      <header className="flex items-start justify-between gap-6">
        <div>{c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="h-14 w-auto" /> : <p className="text-2xl font-black tracking-tight text-[#071a33]">{c.name}</p>}</div>
        <div className="text-right text-[11px] leading-snug text-neutral-600">
          <p className="text-[13px] font-bold text-[#071a33]">{c.registeredName || c.name}</p>
          {c.address && <p className="whitespace-pre-line">{c.address}</p>}
          <p>{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
          {c.website && <p>{c.website}</p>}
        </div>
      </header>
      <div className="mt-5 h-1 w-full bg-gradient-to-r from-[#071a33] via-[#071a33] to-[#f5b400]" />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#b07f00]">{title}</p>
          <h1 className="mt-1 text-[22px] font-black leading-tight text-[#071a33]">{d.title}</h1>
          {subtitle && <p className="mt-0.5 text-neutral-600">{subtitle}</p>}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 rounded-lg border border-neutral-200 px-4 py-2 text-xs">
          {details.map(([k, v]) => <Fragment key={k}><dt className="text-neutral-500">{k}</dt><dd className="text-right font-semibold text-[#071a33]">{v}</dd></Fragment>)}
        </dl>
      </div>
      <div className="mt-7 space-y-7">{children}</div>
      <footer className="mt-12 flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-3 text-[10px] text-neutral-500">
        <span>{c.registeredName || c.name}{c.companyNo ? ` · Registered in England & Wales no. ${c.companyNo}` : ""}{c.vatNo ? ` · VAT no. ${c.vatNo}` : ""}</span>
        <span>{c.memberships}</span>
      </footer>
    </section>
  );
}

/** Numbered section heading: "3  Scope of works & price". */
export const SectionTitle = ({ n, children }: { n?: number | string; children: ReactNode }) => (
  <h2 className="flex items-baseline gap-3 border-b-2 border-[#071a33] pb-1.5 text-[15px] font-bold text-[#071a33]">{n !== undefined && <span className="text-[#b07f00]">{n}</span>}{children}</h2>
);

/** Signature block: one column per party, with name, signature and date lines. */
export function Signatures({ parties }: { parties: { role: string; name?: string }[] }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 print:grid-cols-2">
      {parties.map(p => (
        <div key={p.role} className="break-inside-avoid rounded-lg border border-neutral-200 p-4 text-xs">
          <p className="font-bold uppercase tracking-wide text-[#071a33]">{p.role}</p>
          {(["Name", "Signature", "Date"] as const).map(l => <div key={l} className="mt-6 flex items-end gap-2"><span className="w-16 shrink-0 text-neutral-500">{l}</span><span className="flex-1 border-b border-neutral-400 pb-0.5 font-semibold">{l === "Name" ? p.name ?? "" : ""}</span></div>)}
        </div>
      ))}
    </div>
  );
}

export const H = ({ children }: { children: ReactNode }) => <h2 className="border-b-2 border-[#071a33] pb-1.5 text-[15px] font-bold text-[#071a33]">{children}</h2>;
export const Sections = ({ list }: { list: DocSection[] }) => (
  <>{list.map(s => (
    <div key={s.heading} className="break-inside-avoid">
      <h3 className="font-bold">{s.heading}</h3>
      {s.paragraphs?.map((p, i) => <p key={i} className="mt-1">{p}</p>)}
      {s.items && <ul className="mt-1 list-disc space-y-0.5 pl-5">{s.items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </div>
  ))}</>
);
