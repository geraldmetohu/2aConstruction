"use client";
import { useEffect, useState } from "react";
import { Check, Layers, Printer, ShieldCheck } from "lucide-react";
import type { CompanyProfile } from "@/app/lib/takeoff/company";
import { IMS_GROUPS, type ImsDoc } from "@/app/lib/compliance/ims";
import { ImsCover, ImsDocument } from "./ImsDocuments";

const PACKS: { label: string; ids: (docs: ImsDoc[]) => string[] }[] = [
  { label: "Policies to sign", ids: d => d.filter(x => x.group === "Policies").map(x => x.id) },
  { label: "Tender pack", ids: d => d.filter(x => x.group === "Tender pack" || ["quality", "environment", "hs", "equality", "slavery", "bribery", "data"].includes(x.id)).map(x => x.id) },
  { label: "Full system", ids: d => d.map(x => x.id) },
];

/** ISO management system documents: read one at a time, or join several into one PDF. */
export function ImsViewer({ docs, company, issued, review, missing }: { docs: ImsDoc[]; company: CompanyProfile; issued: string; review: string; missing: string[] }) {
  const [cur, setCur] = useState(docs[0]?.id ?? "");
  const [joining, setJoining] = useState(false);
  const [picked, setPicked] = useState<string[]>(PACKS[0].ids(docs));
  const doc = docs.find(d => d.id === cur) ?? docs[0];
  const ordered = docs.filter(d => picked.includes(d.id));
  const pack = PACKS.find(p => { const ids = p.ids(docs); return ids.length === ordered.length && ids.every(i => picked.includes(i)); })?.label;
  useEffect(() => { document.title = `${company.name} – ${joining ? pack ?? "Management system documents" : `${doc.ref} ${doc.title}`}`; }, [joining, pack, doc, company.name]);
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="flex items-center gap-2 text-2xl font-black text-neutral-900"><ShieldCheck className="h-6 w-6 text-amber-600" />ISO & tender documents</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">An integrated management system following ISO 9001 (quality), ISO 14001 (environment) and ISO 45001 (health & safety), with the policies and answers construction tenders ask for. Everything is filled in from the Company page.</p>
        <p className="mt-2 max-w-3xl rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">These documents set up the system – they don&apos;t make the company certified. Certification needs an audit by a UKAS-accredited certification body (see TND-03). Until then, say &ldquo;management system aligned to ISO 9001, 14001 and 45001&rdquo;, not &ldquo;ISO certified&rdquo;.</p>
        {missing.length > 0 && <p className="mt-2 max-w-3xl rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">Add on the Company page before signing: {missing.join(", ")}.</p>}
      </div>
      <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-6">
        <nav className="mb-4 print:hidden lg:mb-0">
          <div className="mb-3 grid grid-cols-2 rounded-full bg-neutral-100 p-1 text-xs font-bold">
            <button onClick={() => setJoining(false)} className={`rounded-full px-3 py-1.5 ${!joining ? "bg-white shadow-sm" : "text-neutral-500"}`}>One at a time</button>
            <button onClick={() => setJoining(true)} className={`inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 ${joining ? "bg-white shadow-sm" : "text-neutral-500"}`}><Layers className="h-3.5 w-3.5" />Join</button>
          </div>
          {!joining && <select value={cur} onChange={e => setCur(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2.5 text-base lg:hidden">
            {IMS_GROUPS.map(g => <optgroup key={g} label={g}>{docs.filter(d => d.group === g).map(d => <option key={d.id} value={d.id}>{d.ref} · {d.title}</option>)}</optgroup>)}
          </select>}
          {joining && <div className="mb-3 flex flex-wrap gap-1.5">
            {PACKS.map(p => <button key={p.label} onClick={() => setPicked(p.ids(docs))} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${pack === p.label ? "border-amber-500 bg-amber-500 text-neutral-950" : "bg-white hover:border-amber-500"}`}>{p.label}</button>)}
            <button onClick={() => setPicked([])} className="rounded-full px-2.5 py-1 text-xs text-neutral-500 underline">Clear</button>
          </div>}
          <div className={`space-y-4 rounded-xl border bg-white p-3 ${joining ? "" : "hidden lg:block"}`}>
            {IMS_GROUPS.map(g => (
              <div key={g}>
                <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{g}</p>
                <ul className="space-y-0.5">{docs.filter(d => d.group === g).map(d => {
                  const on = joining ? picked.includes(d.id) : cur === d.id;
                  return <li key={d.id}><button onClick={() => joining ? setPicked(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id]) : setCur(d.id)}
                    className={`flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left text-sm ${on ? "bg-amber-50 font-semibold text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}>
                    {joining && <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-amber-500 bg-amber-500 text-neutral-950" : "border-neutral-300"}`}>{on && <Check className="h-3 w-3" />}</span>}
                    <span className="w-14 shrink-0 font-mono text-[11px] text-neutral-400">{d.ref}</span><span className="min-w-0">{d.title}</span></button></li>;
                })}</ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
            <p className="text-sm font-bold text-neutral-900">{joining ? <>{pack ?? "Joined documents"}<span className="ml-2 text-xs font-normal text-neutral-500">{ordered.length} documents, each on new pages</span></> : <>{doc.ref} · {doc.title}</>}</p>
            <button onClick={() => window.print()} disabled={joining && !ordered.length} className="ml-auto inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-neutral-950 disabled:opacity-40"><Printer className="h-4 w-4" />{joining ? "Print / save as one PDF" : "Print / save as PDF"}</button>
          </div>
<style>{`@media print { @page { size: A4; margin: 14mm; } body * { visibility: hidden !important; } .doc-print, .doc-print * { visibility: visible !important; } .doc-print { position: absolute; left: 0; top: 0; width: 100%; } .doc-print .doc-page:first-of-type { break-before: auto; } }`}</style>
          <div className="doc-print space-y-8 text-[13px] leading-relaxed text-neutral-900 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:space-y-0">
            {joining
              ? (ordered.length ? <>{ordered.length > 1 && <ImsCover docs={ordered} company={company} issued={issued} title={pack ?? "Management system documents"} />}{ordered.map(d => <ImsDocument key={d.id} doc={d} company={company} issued={issued} review={review} />)}</>
                : <p className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-neutral-500">Tick the documents to join.</p>)
              : doc && <ImsDocument doc={doc} company={company} issued={issued} review={review} />}
          </div>
        </div>
      </div>
    </div>
  );
}
