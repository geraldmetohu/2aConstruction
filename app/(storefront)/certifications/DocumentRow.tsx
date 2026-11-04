"use client";
import { useState } from "react";
import { Download, Eye, EyeOff, FileText } from "lucide-react";

/** A policy or certificate: read the summary, open it inline, or download the PDF. */
export function DocumentRow({ id, index, title, desc, file }: { id: string; index: number; title: string; desc: string; file: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li id={id} className="scroll-mt-32 border-b border-[#071a33]/10 py-8">
      <div className="grid gap-5 md:grid-cols-12 md:items-start">
        <div className="md:col-span-8">
          <h3 className="flex items-center gap-3 text-xl font-semibold text-[#071a33]"><FileText aria-hidden className="h-5 w-5 text-neutral-400" />{title}</h3>
          <p className="mt-3 leading-relaxed text-neutral-600">{desc}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-4 md:justify-end">
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={`${id}-viewer`}
            className="inline-flex items-center gap-2 border border-[#071a33] px-4 py-2.5 text-sm font-semibold text-[#071a33] transition-colors hover:bg-[#071a33] hover:text-white">
            {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{open ? "Close" : "Read"}
          </button>
          <a href={file} target="_blank" rel="noopener noreferrer" download
            className="inline-flex items-center gap-2 border border-[#f5b400] bg-[#f5b400] px-4 py-2.5 text-sm font-semibold text-[#071a33] transition-colors hover:border-[#071a33] hover:bg-[#071a33] hover:text-white">
            <Download className="h-4 w-4" />PDF
          </a>
        </div>
      </div>
      {open && (
        <div id={`${id}-viewer`} className="mt-6 h-[70vh] overflow-hidden border border-[#071a33]/15 bg-neutral-100">
          <iframe src={`${file}#zoom=page-width`} title={title} className="h-full w-full" />
        </div>
      )}
    </li>
  );
}
