"use client";
import { useState } from "react";
import { Printer } from "lucide-react";
import type { QuoteDocs } from "@/app/lib/takeoff/documents";
import { docKinds, QuoteDocuments, type DocKind } from "./QuoteDocuments";

/** Pick which documents to view / print. Printing outputs each document on its own pages. */
export function DocumentsViewer({ docs, warnings = [] }: { docs: QuoteDocs; warnings?: string[] }) {
  const [show, setShow] = useState<DocKind[]>(["quote"]);
  const toggle = (k: DocKind) => setShow(s => (s.includes(k) ? (s.length > 1 ? s.filter(x => x !== k) : s) : docKinds.map(([x]) => x).filter(x => x === k || s.includes(x))));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        {docKinds.map(([k, l]) => (
          <button key={k} onClick={() => toggle(k)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${show.includes(k) ? "border-neutral-900 bg-neutral-900 text-white" : "bg-white text-neutral-700"}`}>{l}</button>
        ))}
        <button onClick={() => setShow(docKinds.map(([k]) => k))} className="rounded-full border px-3 py-1.5 text-xs">All</button>
        <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-neutral-950"><Printer className="h-4 w-4" />Print / save as PDF</button>
      </div>
      {warnings.length > 0 && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-900 print:hidden">Fill in on the Company &amp; documents page before sending: {warnings.join(", ")}.</p>}
      <div className="doc-print"><QuoteDocuments docs={docs} show={show} /></div>
      {/* Print only the documents, whatever page they sit in (dashboard sidebar, steps, site header). */}
      <style>{`@media print { @page { size: A4; margin: 14mm; } body * { visibility: hidden !important; } .doc-print, .doc-print * { visibility: visible !important; } .doc-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  );
}
