"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Printer } from "lucide-react";
import type { QuoteDocs } from "@/app/lib/takeoff/documents";
import { docCatalogue, QuoteDocuments, type DocGroup, type DocKind } from "./QuoteDocuments";

const GROUPS: DocGroup[] = ["Client", "Health & safety", "Compliance & quality", "Completion"];

/**
 * Each document on its own: pick one from the list, read it, print / save it as its own PDF.
 * The client sees only the documents meant for them (not permits, registers or toolbox talks).
 */
export function DocumentsViewer({ docs, warnings = [], audience = "admin", note }: { docs: QuoteDocs; warnings?: string[]; audience?: "admin" | "client"; note?: string }) {
  const kinds = docCatalogue.filter(([, , , client]) => audience === "admin" || client);
  const [cur, setCur] = useState<DocKind>("quote");
  const i = Math.max(0, kinds.findIndex(([k]) => k === cur));
  const [, label] = kinds[i] ?? kinds[0];
  const go = (n: number) => { const k = kinds[n]?.[0]; if (k) { setCur(k); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const print = () => {
    // The browser uses the page title as the PDF file name.
    const old = document.title;
    document.title = `${docs.reference} – ${label}`;
    window.print();
    setTimeout(() => { document.title = old; }, 500);
  };
  return (
    <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-6">
      <nav className="mb-4 print:hidden lg:mb-0">
        <select value={cur} onChange={e => setCur(e.target.value as DocKind)} aria-label="Document" className="w-full rounded-lg border bg-white px-3 py-2 text-sm font-semibold lg:hidden">
          {GROUPS.map(g => kinds.some(([, , gr]) => gr === g) && <optgroup key={g} label={g}>{kinds.filter(([, , gr]) => gr === g).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>)}
        </select>
        <div className="sticky top-4 hidden space-y-4 lg:block">
          {GROUPS.map(g => kinds.some(([, , gr]) => gr === g) && (
            <div key={g}>
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{g}</p>
              <ul className="space-y-0.5">{kinds.filter(([, , gr]) => gr === g).map(([k, l]) => (
                <li key={k}><button onClick={() => setCur(k)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${k === cur ? "bg-neutral-900 font-semibold text-white" : "text-neutral-700 hover:bg-neutral-100"}`}><FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />{l}</button></li>
              ))}</ul>
            </div>
          ))}
        </div>
      </nav>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex items-center gap-1">
            <button onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous document" className="rounded-full border bg-white p-1.5 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => go(i + 1)} disabled={i >= kinds.length - 1} aria-label="Next document" className="rounded-full border bg-white p-1.5 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <p className="text-sm font-bold text-neutral-900">{label}<span className="ml-2 text-xs font-normal text-neutral-500">{i + 1} of {kinds.length}</span></p>
          {note && <span className="text-xs text-neutral-500">{note}</span>}
          <button onClick={print} className="ml-auto inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-neutral-950"><Printer className="h-4 w-4" />Print / save this as PDF</button>
        </div>
        {warnings.length > 0 && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-900 print:hidden">Fill in on the Company &amp; documents page before sending: {warnings.join(", ")}.</p>}
        <div className="doc-print"><QuoteDocuments docs={docs} show={[cur]} /></div>
      </div>
      {/* Print only this document, whatever page it sits in (dashboard sidebar, steps, site header). */}
      <style>{`@media print { @page { size: A4; margin: 14mm; } body * { visibility: hidden !important; } .doc-print, .doc-print * { visibility: visible !important; } .doc-print { position: absolute; left: 0; top: 0; width: 100%; } .doc-print .doc-page:first-of-type { break-before: auto; } }`}</style>
    </div>
  );
}
