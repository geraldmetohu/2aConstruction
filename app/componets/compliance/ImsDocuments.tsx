import { longDate } from "@/app/lib/takeoff/documents";
import type { CompanyProfile } from "@/app/lib/takeoff/company";
import type { ImsDoc } from "@/app/lib/compliance/ims";
import { Callout, Cover, Page, ScrollX, SectionTitle, Signatures, type DocHead } from "../takeoff/DocParts";

const head = (company: CompanyProfile, title: string, reference: string, issued: string): DocHead => ({ company, title, reference, version: 1, issueDate: issued });

/** One management system document on the company letterhead, with document control and (for policies) the director's signature. */
export function ImsDocument({ doc, company, issued, review }: { doc: ImsDoc; company: CompanyProfile; issued: string; review: string }) {
  const md = company.director || "Managing Director";
  return (
    <Page d={head(company, doc.title, doc.ref, issued)} title={doc.group === "Policies" ? "Policy" : doc.group === "Procedures" ? "Procedure" : doc.group === "Manual" ? "Management system manual" : doc.group === "Tender pack" ? "Tender document" : "Register / form"}
      subtitle={doc.standards} meta={[["Ref", `${doc.ref} rev 1`], ["Issued", longDate(issued)], ["Review by", longDate(review)]]}>
      <Callout tone="navy" title="Purpose">{doc.purpose}</Callout>
      {doc.blocks.map((b, i) => (
        <div key={i} className="break-inside-avoid">
          <SectionTitle n={/^\d+\./.test(b.heading) ? undefined : doc.blocks.length > 1 ? i + 1 : undefined}>{b.heading}</SectionTitle>
          {b.paragraphs?.map((p, j) => <p key={j} className="mt-1.5">{p}</p>)}
          {b.items && <ul className="mt-1.5 space-y-1">{b.items.map((x, j) => <li key={j} className="flex gap-2"><span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-[#f5b400]" /><span>{x}</span></li>)}</ul>}
          {b.table && (
            <div className="mt-2"><ScrollX min={Math.max(480, b.table.cols.length * 90)}>
              <table className="w-full table-fixed border-collapse text-[11.5px]">
                {b.table.widths && <colgroup>{b.table.widths.map((w, k) => <col key={k} style={{ width: `${w}%` }} />)}</colgroup>}
                <thead><tr className="bg-[#071a33] text-left text-[10px] uppercase tracking-wide text-white">{b.table.cols.map(c => <th key={c} className="border border-[#071a33] px-2 py-1.5 font-bold">{c}</th>)}</tr></thead>
                <tbody>
                  {b.table.rows.map((r, k) => <tr key={k} className={`align-top ${k % 2 ? "bg-neutral-50" : ""}`}>{r.map((cell, m) => <td key={m} className={`border border-neutral-200 px-2 py-1.5 ${m === 0 ? "font-semibold text-[#071a33]" : ""}`}>{cell}</td>)}</tr>)}
                  {Array.from({ length: b.table.blank ?? 0 }, (_, k) => <tr key={`b${k}`}>{b.table!.cols.map(c => <td key={c} className="h-8 border border-neutral-300" />)}</tr>)}
                </tbody>
              </table>
            </ScrollX></div>
          )}
        </div>
      ))}
      {doc.sign && <div className="mt-2"><Signatures parties={[{ role: `Approved for ${company.registeredName || company.name}`, name: company.director ? `${md}, Managing Director` : "" }, { role: "Next review" }]} /></div>}
      <div className="break-inside-avoid">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Document control</p>
        <ScrollX min={420}><table className="w-full border-collapse text-[11px]"><thead><tr className="bg-neutral-100 text-left"><th className="border px-2 py-1">Rev</th><th className="border px-2 py-1">Date</th><th className="border px-2 py-1">Change</th><th className="border px-2 py-1">Approved</th></tr></thead>
          <tbody><tr><td className="border px-2 py-1">1</td><td className="border px-2 py-1">{longDate(issued)}</td><td className="border px-2 py-1">First issue</td><td className="border px-2 py-1">{md}</td></tr><tr><td className="h-7 border" /><td className="border" /><td className="border" /><td className="border" /></tr></tbody></table></ScrollX>
      </div>
    </Page>
  );
}

/** Cover page for the whole system or a joined set. */
export function ImsCover({ docs, company, issued, title }: { docs: ImsDoc[]; company: CompanyProfile; issued: string; title: string }) {
  return (
    <Cover d={head(company, title, "IMS", issued)} kind="Integrated management system" lead="Quality · Environment · Health & Safety – documents following ISO 9001:2015, ISO 14001:2015 and ISO 45001:2018."
      meta={[["Issued", longDate(issued)], ["Documents", String(docs.length)], ["Approved by", company.director || "Managing Director"]]}
      contents={docs.map(d => `${d.ref}  ${d.title}`)} facts={[["Quality", "ISO 9001"], ["Environment", "ISO 14001"], ["Health & safety", "ISO 45001"], ["Policies", String(docs.filter(d => d.group === "Policies").length)]]} />
  );
}
