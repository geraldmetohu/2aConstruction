import type { ReactNode } from "react";
import { longDate, type DocSection, type QuoteDocs } from "@/app/lib/takeoff/documents";
import type { QuoteLayout } from "@/app/lib/takeoff/quote-format";

import { PACK_RENDER, packKinds, type PackKind } from "./ProjectPack";
import { band, H, Page, SectionTitle, Sections, Signatures } from "./DocParts";

export type DocKind = "quote" | "contract" | "cancellation" | "guarantee" | "cpp" | "rams" | PackKind;
type KindInfo = [DocKind, string, DocGroup, boolean];
export type DocGroup = "Client" | "Health & safety" | "Compliance & quality" | "Completion";
/** Every document: [kind, name, group, shown to the client]. */
export const docCatalogue: KindInfo[] = [
  ["quote", "Quotation", "Client", true], ["contract", "Contract", "Client", true], ["cancellation", "Cancellation form", "Client", true], ["guarantee", "Workmanship guarantee", "Client", true],
  ...packKinds.filter(k => k[2] === "Client"),
  ["cpp", "Construction phase plan", "Health & safety", true], ["rams", "Risk assessment summary, method statements & COSHH", "Health & safety", true],
  ...packKinds.filter(k => k[2] !== "Client"),
];
export const docKinds: [DocKind, string][] = docCatalogue.map(([k, l]) => [k, l]);

const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The client document pack. Printable: each document starts on a new page. No costs, rates or margins. */
export function QuoteDocuments({ docs: d, show }: { docs: QuoteDocs; show: DocKind[] }) {
  return (
    <div className="space-y-8 text-[13px] leading-relaxed text-neutral-900 print:space-y-0">
      {show.includes("quote") && <Quotation d={d} />}
      {show.includes("contract") && <Contract d={d} />}
      {show.includes("cancellation") && <Cancellation d={d} />}
      {show.includes("guarantee") && <Guarantee d={d} />}
      {show.includes("cpp") && <Plan d={d} />}
      {show.includes("rams") && <Rams d={d} />}
      {d.pack && packKinds.filter(([k]) => show.includes(k)).map(([k]) => <div key={k}>{PACK_RENDER[k](d, d.pack!)}</div>)}
    </div>
  );
}

const Parties = ({ d }: { d: QuoteDocs }) => (
  <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
    <div className="rounded-lg border border-neutral-200 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Prepared for</p><p className="mt-1 font-semibold text-[#071a33]">{d.client.name || "—"}</p>
      {d.client.address && <p className="whitespace-pre-line text-neutral-700">{d.client.address}</p>}<p className="text-neutral-600">{[d.client.email, d.client.phone].filter(Boolean).join(" · ")}</p></div>
    <div className="rounded-lg border border-neutral-200 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Site address</p><p className="mt-1 whitespace-pre-line text-neutral-700">{d.client.siteAddress || "—"}</p></div>
  </div>
);

/** Working day → "Week 3 · days 11–13" (programme without a start date). */
const dayRange = (a: number, b: number) => {
  const s = Math.floor(a) + 1, e = Math.max(s, Math.floor(b) + 1), w1 = Math.floor((s - 1) / 5) + 1, w2 = Math.floor((e - 1) / 5) + 1;
  return `${w1 === w2 ? `Week ${w1}` : `Weeks ${w1}–${w2}`} · day${s === e ? ` ${s}` : `s ${s}–${e}`}`;
};

function Quotation({ d }: { d: QuoteDocs }) {
  const sec = (() => { let n = 0; return () => ++n; })();
  return (
    <Page d={d} title="Quotation" meta={[["Quotation no.", `${d.reference}${d.version > 1 ? ` · v${d.version}` : ""}`], ["Date", longDate(d.issueDate)], ["Valid until", longDate(d.validUntil)]]}>
      <Parties d={d} />

      {/* Price at a glance */}
      <div className="grid break-inside-avoid gap-px overflow-hidden rounded-xl bg-[#071a33]/10 sm:grid-cols-4 print:grid-cols-4">
        {([["Price (ex VAT)", gbp(d.price.net)], ["VAT", gbp(d.price.vat)], ["Total including VAT", gbp(d.price.gross)], ["Programme", `≈ ${d.weeks} week${d.weeks === 1 ? "" : "s"}`]] as const).map(([k, v], i) => (
          <div key={k} className={`p-4 ${i === 2 ? "bg-[#071a33] text-white" : "bg-white"}`}><p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${i === 2 ? "text-[#f5b400]" : "text-neutral-500"}`}>{k}</p><p className="mt-1 text-lg font-black tabular-nums">{v}</p></div>
        ))}
      </div>

      {d.letter && <div className="space-y-2"><p>{d.letter.greeting}</p>{d.letter.paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>}

      <div><SectionTitle n={sec()}>Description of the works</SectionTitle>{d.description.map((p, i) => <p key={i} className="mt-2">{p}</p>)}</div>

      {d.layout ? <ScopeTable layout={d.layout} price={d.price} n={sec()} /> : <div><SectionTitle n={sec()}>Scope of works</SectionTitle>
        <ol className="mt-2 space-y-3">{d.scope.map(s => (
          <li key={s.heading} className="break-inside-avoid"><p className="font-semibold">{s.heading}{s.dates && <span className="ml-2 text-xs font-normal text-neutral-500">{s.dates}</span>}</p>
            <ul className="mt-0.5 list-disc space-y-0.5 pl-5">{s.items.map((x, i) => <li key={i}>{x}</li>)}</ul></li>
        ))}</ol>
      </div>}

      <div className="break-inside-avoid"><SectionTitle n={sec()}>Programme</SectionTitle>
        <p className="mt-2">{d.start ? <>Start <strong>{longDate(d.start)}</strong>, practical completion around <strong>{longDate(d.finish!)}</strong> – </> : null}about {d.workingDays} working days (≈ {d.weeks} weeks), Monday to Friday excluding bank holidays.</p>
        <table className="mt-2 w-full text-xs"><thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1.5">Stage</th><th className="text-right">{d.start ? "Dates" : "When"}</th></tr></thead>
          <tbody>{d.programme.filter(r => r.days > 0).map(r => <tr key={r.stage} className="border-b border-neutral-100"><td className="py-1.5">{r.label}</td><td className="text-right text-neutral-700">{r.start ? (r.start === r.end ? longDate(r.start) : `${longDate(r.start)} – ${longDate(r.end!)}`) : dayRange(r.startDay, r.endDay)}</td></tr>)}</tbody></table>
        <p className="mt-1 text-[11px] text-neutral-500">The programme is our planned sequence; stages may overlap and dates move with weather, inspections and any changes you ask for.</p>
      </div>

      {!d.layout && <div className="break-inside-avoid"><SectionTitle n={sec()}>Price</SectionTitle>
        <table className="mt-2 w-full"><tbody>
          {d.price.areas.map(a => <tr key={a.area} className="border-b"><td className="py-1">{a.area}</td><td className="text-right">{gbp(a.net)}</td></tr>)}
          <tr><td className="pt-2 font-semibold">Total (ex VAT)</td><td className="pt-2 text-right font-semibold">{gbp(d.price.net)}</td></tr>
          {d.price.discount && <tr><td>Less: {d.price.discount.label}</td><td className="text-right">−{gbp(d.price.discount.amount)}</td></tr>}
          <tr><td>VAT</td><td className="text-right">{gbp(d.price.vat)}</td></tr>
          <tr className="text-base"><td className="font-black">Total including VAT</td><td className="text-right font-black">{gbp(d.price.gross)}</td></tr>
        </tbody></table>
      </div>}

      <div className="break-inside-avoid"><SectionTitle n={sec()}>Payment schedule</SectionTitle>
        <table className="mt-2 w-full table-fixed text-xs"><colgroup><col className="w-[5%]" /><col className="w-[19%]" /><col className="w-[42%]" /><col className="w-[15%]" /><col className="w-[6%]" /><col className="w-[13%]" /></colgroup>
          <thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1.5">No.</th><th>Payment</th><th>Due when</th><th>Expected</th><th className="text-right">%</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{d.payments.map(p => <tr key={p.n} className="border-b border-neutral-100 align-top"><td className="py-1.5 text-neutral-500">{p.n}</td><td className="pr-2 font-semibold">{p.label}</td><td className="pr-2 text-neutral-700">{p.when}</td><td className="whitespace-nowrap">{p.date ? longDate(p.date) : "—"}</td><td className="text-right">{p.percent.toFixed(1)}</td><td className="text-right font-semibold tabular-nums">{gbp(p.amount)}</td></tr>)}
            <tr className="border-t-2 border-[#071a33]"><td colSpan={5} className="pt-1.5 text-right font-semibold">Total including VAT</td><td className="pt-1.5 text-right font-black tabular-nums">{gbp(d.payments.reduce((s, p) => s + p.amount, 0))}</td></tr></tbody></table>
        <p className="mt-1 text-[11px] text-neutral-600">Each payment is invoiced when it falls due and is payable within {d.paymentDays} days by bank transfer{d.company.accountNumber ? ` to ${d.company.accountName || d.company.registeredName}, sort code ${d.company.sortCode}, account ${d.company.accountNumber}` : ""}. We will never change our bank details by email.</p>
      </div>

      {d.supplies.length > 0 && <div><SectionTitle n={sec()}>Items supplied by you</SectionTitle>
        <p className="mt-2 text-xs text-neutral-600">Not included in our price. Please order them to the specification below and have them on site by the date shown; quantities include an allowance for cuts. We are happy to advise before you buy.</p>
        <table className="mt-2 w-full text-xs"><thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1.5">Item</th><th>Specification</th><th className="text-right">Quantity</th><th className="pl-2">Needed</th></tr></thead>
          <tbody>{d.supplies.map((s, i) => <tr key={i} className="border-b border-neutral-100 align-top"><td className="py-1.5 pr-2">{s.item}<span className="block text-neutral-500">{s.area}</span></td><td className="pr-2">{s.spec || "—"}</td><td className="whitespace-nowrap text-right">{s.quantity} {s.unit}</td><td className="whitespace-nowrap pl-2">{s.neededBy}</td></tr>)}</tbody></table></div>}

      <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        <div><SectionTitle n={sec()}>Not included</SectionTitle><ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">{d.exclusions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        <div><SectionTitle n={sec()}>Assumptions</SectionTitle><ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">{d.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      </div>

      <div className="break-inside-avoid"><SectionTitle n={sec()}>Acceptance</SectionTitle>
        <p className="mt-2">This quotation is valid until <strong>{longDate(d.validUntil)}</strong>. It is subject to our contract terms, {d.guarantee.years}-year workmanship guarantee and the health &amp; safety documents provided with it. You can accept online in your client portal, or sign below and return a copy.</p>
        <div className="mt-4"><Signatures parties={[{ role: `For ${d.company.registeredName || d.company.name}` }, { role: "Client", name: d.client.name }]} /></div>
      </div>
    </Page>
  );
}

const Tags = ({ r }: { r: { vatPercent?: number; provisional?: boolean } }) => <>
  {r.provisional && <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">Provisional sum</span>}
  {r.vatPercent !== undefined && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-800">{r.vatPercent}% VAT</span>}
</>;
const qty = (q: number, unit: string) => `${Number(q.toFixed(2))}${unit ? ` ${unit}` : ""}`;

/** Scope of works with prices, in the format chosen for this client. Trades are never shown to the client. */
export function ScopeTable({ layout: L, price: p, n: sectionNo }: { layout: QuoteLayout; price: QuoteDocs["price"]; n?: number }) {
  const vb = p.vatBreakdown && p.vatBreakdown.length > 1 ? p.vatBreakdown : null;
  const totals = (
    <table className="ml-auto mt-4 w-full max-w-sm break-inside-avoid text-sm"><tbody>
      {p.discount && <><tr><td className="py-0.5">Subtotal</td><td className="text-right tabular-nums">{gbp(p.discount.netBeforeDiscount)}</td></tr>
        <tr><td className="py-0.5">Less: {p.discount.label}</td><td className="text-right tabular-nums">−{gbp(p.discount.amount)}</td></tr></>}
      <tr><td className="py-0.5 font-semibold">Total (ex VAT)</td><td className="text-right font-semibold tabular-nums">{gbp(p.net)}</td></tr>
      {vb ? vb.map(v => <tr key={v.percent}><td className="py-0.5">VAT at {v.percent}% on {gbp(v.net)}</td><td className="text-right tabular-nums">{gbp(v.vat)}</td></tr>) : <tr><td className="py-0.5">VAT</td><td className="text-right tabular-nums">{gbp(p.vat)}</td></tr>}
      <tr className="border-t-2 border-[#071a33] text-base"><td className="pt-1.5 font-black">Total including VAT</td><td className="pt-1.5 text-right font-black tabular-nums">{gbp(p.gross)}</td></tr>
    </tbody></table>
  );
  const extras = (
    <>
      {L.options.length > 0 && <div className="mt-5 break-inside-avoid"><h3 className="font-bold text-[#071a33]">Optional extras{L.options.some(o => o.chosen) ? "" : " (not included in the price above)"}</h3>
        <table className="mt-1 w-full text-xs"><tbody>{L.options.map((o, i) => <tr key={i} className="border-b border-neutral-100"><td className="py-1">{o.title}</td><td className="text-right">{o.chosen ? "Added – included above" : o.price != null ? `${gbp(o.price)} + VAT` : "Price on request"}</td></tr>)}</tbody></table></div>}
      {L.notes && <div className="mt-5 break-inside-avoid rounded-lg border-l-4 border-[#f5b400] bg-amber-50/60 p-3"><h3 className="font-bold">Notes &amp; provisional sums</h3><p className="mt-1 whitespace-pre-line">{L.notes}</p></div>}
    </>
  );
  const title = `Scope of works & price${L.format === "ITEMISED" ? " – itemised" : ""}`;

  if (L.format === "SIMPLE") return (
    <div><SectionTitle n={sectionNo}>{title}</SectionTitle>
      <table className="mt-3 w-full table-fixed">
        <colgroup><col className="w-[7%]" /><col className="w-[23%]" /><col className="w-[52%]" /><col className="w-[18%]" /></colgroup>
        <thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1.5">No.</th><th>Stage</th><th>Description of works</th><th className="text-right">Price (ex VAT)</th></tr></thead>
        {L.groups.map((g, gi) => (
          <tbody key={g.key} className="break-inside-avoid">
            <tr className="bg-[#071a33]/[0.06]"><td className="px-1 py-2 font-bold text-[#071a33]">{gi + 1}</td><td colSpan={2} className="py-2 font-bold text-[#071a33]">{g.title}</td><td className="px-1 text-right font-bold tabular-nums">{gbp(g.net)}</td></tr>
            {g.text && <tr><td /><td colSpan={3} className="py-1.5 pr-2 text-xs italic text-neutral-600">{g.text}</td></tr>}
            {g.rows.map((r, ri) => (
              <tr key={r.key} className="border-b border-neutral-100 align-top"><td className="px-1 py-2 text-neutral-500">{gi + 1}.{ri + 1}</td><td className="py-2 pr-3 font-semibold">{r.title}<Tags r={r} /></td><td className="py-2 pr-3 text-neutral-800">{r.text}</td><td className="px-1 py-2 text-right font-semibold tabular-nums">{gbp(r.net)}</td></tr>
            ))}
          </tbody>
        ))}
      </table>
      {totals}{extras}
    </div>
  );

  return (
    <div><SectionTitle n={sectionNo}>{title}</SectionTitle>
      <div className="mt-3 space-y-6">
        {L.groups.map((g, gi) => (
          <section key={g.key}>
            <div className="flex items-baseline justify-between gap-3 rounded-md bg-[#071a33] px-3 py-1.5 text-white"><h3 className="text-[13px] font-bold"><span className="mr-2 text-[#f5b400]">{gi + 1}</span>{g.title}</h3><span className="font-bold tabular-nums">{gbp(g.net)}</span></div>
            {g.text && <p className="mt-2 text-xs italic text-neutral-600">{g.text}</p>}
            <div className="mt-2 divide-y divide-neutral-200">
              {g.rows.map((r, ri) => (
                <div key={r.key} className="break-inside-avoid py-3">
                  <div className="flex items-baseline justify-between gap-3"><p className="font-semibold text-[#071a33]"><span className="mr-2 text-neutral-400">{gi + 1}.{ri + 1}</span>{r.title}<Tags r={r} /></p><span className="font-semibold tabular-nums">{gbp(r.net)}</span></div>
                  <p className="mt-0.5 pl-8 text-neutral-800">{r.text}</p>
                  {L.format === "NORMAL" && r.items && r.items.length > 0 && (
                    <ul className="mt-1.5 grid gap-x-6 pl-8 text-xs text-neutral-600 sm:grid-cols-2 print:grid-cols-2">
                      {r.items.map(i => <li key={i.id} className="flex justify-between gap-2 border-b border-dotted border-neutral-300 py-0.5"><span>{i.description}{i.byClient ? " (supplied by you)" : ""}</span><span className="whitespace-nowrap">{qty(i.quantity, i.unit)}</span></li>)}
                    </ul>
                  )}
                  {L.format === "ITEMISED" && r.items && r.items.length > 0 && (
                    <table className="ml-8 mt-1.5 w-[calc(100%-2rem)] table-fixed text-xs">
                      <colgroup><col className="w-[55%]" /><col className="w-[15%]" /><col className="w-[14%]" /><col className="w-[16%]" /></colgroup>
                      <thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1 font-semibold">Item</th><th className="text-right font-semibold">Quantity</th><th className="text-right font-semibold">Rate</th><th className="text-right font-semibold">Amount</th></tr></thead>
                      <tbody>{[...r.items].sort((a, b) => (a.kind === "LABOUR" ? 1 : 0) - (b.kind === "LABOUR" ? 1 : 0)).map(i => (
                        <tr key={i.id} className="border-b border-neutral-100 align-top"><td className="py-1 pr-2">{i.description}{i.kind === "LABOUR" && <span className="ml-1.5 rounded bg-neutral-100 px-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-500">Labour</span>}</td><td className="whitespace-nowrap text-right">{qty(i.quantity, i.unit)}</td>
                          <td className="whitespace-nowrap text-right tabular-nums">{i.byClient ? "—" : gbp(i.rate ?? 0)}</td><td className="whitespace-nowrap text-right tabular-nums">{i.byClient ? <span className="text-neutral-500">By you</span> : gbp(i.net ?? 0)}</td></tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {totals}{extras}
    </div>
  );
}

/** Contract terms: particulars, numbered clauses (1.1, 1.2…), the documents that form the contract, signatures. */
function Contract({ d }: { d: QuoteDocs }) {
  const co = d.company.registeredName || d.company.name;
  const deposit = d.payments[0];
  const particulars: [string, string][] = [
    ["Contractor", `${co}${d.company.companyNo ? ` (company no. ${d.company.companyNo})` : ""}`], ["Client", d.client.name || "—"], ["Site", d.client.siteAddress || "—"],
    ["The works", `${d.title} – quotation ${d.reference}${d.version > 1 ? ` v${d.version}` : ""} dated ${longDate(d.issueDate)}`],
    ["Contract sum", `${gbp(d.price.net)} + VAT = ${gbp(d.price.gross)}`], ["Deposit", deposit ? `${gbp(deposit.amount)} (${deposit.percent.toFixed(0)}%) on signing` : "—"],
    ["Start", d.start ? longDate(d.start) : "To be confirmed in writing"], ["Completion", d.finish ? `On or around ${longDate(d.finish)} (${d.workingDays} working days)` : `About ${d.workingDays} working days after starting`],
    ["Payment terms", `${d.paymentDays} days from invoice`], ["Workmanship guarantee", `${d.guarantee.years} years from practical completion`],
  ];
  return (
    <>
      <Page d={d} title="Contract for building works" subtitle="Consumer building contract – particulars and terms">
        <div><SectionTitle>Contract particulars</SectionTitle>
          <table className="mt-2 w-full text-sm"><tbody>{particulars.map(([k, v]) => <tr key={k} className="border-b border-neutral-100 align-top"><td className="w-44 py-1.5 pr-3 text-neutral-500">{k}</td><td className="py-1.5 font-medium text-[#071a33]">{v}</td></tr>)}</tbody></table>
        </div>
        <div className="space-y-5">
          {d.contract.map(s => {
            const m = s.heading.match(/^(\d+)\.\s*(.*)$/), no = m?.[1] ?? "", heading = m?.[2] ?? s.heading;
            return (
              <div key={s.heading} className="break-inside-avoid">
                <h3 className="flex gap-3 font-bold text-[#071a33]"><span className="w-8 shrink-0 text-[#b07f00]">{no}</span>{heading}</h3>
                {s.paragraphs?.map((p, i) => <p key={i} className="mt-1 flex gap-3"><span className="w-8 shrink-0 text-neutral-400">{no}.{i + 1}</span><span>{p}</span></p>)}
                {s.items?.map((x, i) => <p key={i} className="mt-1 flex gap-3"><span className="w-8 shrink-0 text-neutral-400">{no}.{(s.paragraphs?.length ?? 0) + i + 1}</span><span>{x}</span></p>)}
              </div>
            );
          })}
        </div>
        <div className="break-inside-avoid"><SectionTitle>Documents forming this contract</SectionTitle>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs">
            <li>These contract particulars and terms</li><li>Quotation {d.reference} with its scope of works, programme, payment schedule, items supplied by the client, exclusions and assumptions</li>
            <li>{d.guarantee.years}-year workmanship guarantee</li><li>Construction phase plan, risk assessments and method statements</li><li>Any variation agreed in writing (variation order form or the client portal)</li>
          </ol>
        </div>
        <div className="break-inside-avoid"><SectionTitle>Signed</SectionTitle>
          <p className="mt-2 text-xs text-neutral-600">By signing, both parties agree to these terms. Accepting the quotation in the client portal has the same effect.</p>
          <div className="mt-4"><Signatures parties={[{ role: `For ${co}` }, { role: "Client", name: d.client.name }]} /></div>
        </div>
      </Page>
    </>
  );
}

/** The cancellation form is its own document. */
function Cancellation({ d }: { d: QuoteDocs }) {
  return (
    <Page d={d} title="Cancellation form" subtitle="Complete and return this form only if you wish to cancel within 14 days">
      <p className="text-xs text-neutral-600">Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 – model cancellation form.</p>
      <div className="space-y-5">{d.cancellationForm.map((x, i) => <p key={i} className="border-b border-neutral-200 pb-3">{x}</p>)}</div>
    </Page>
  );
}

function Guarantee({ d }: { d: QuoteDocs }) {
  return (
    <Page d={d} title={`${d.guarantee.years}-year workmanship guarantee`}>
      <div className="rounded-xl border-2 border-amber-400 p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Certificate</p>
        <p className="mt-1 text-xl font-black">{d.guarantee.years}-Year Workmanship Guarantee</p>
        <p className="mt-1">Issued to {d.client.name || "the client"} for the works at {d.client.siteAddress || "the property"} (contract {d.reference}).</p>
        <p className="mt-1 text-neutral-600">Valid for {d.guarantee.years} years from the date of practical completion: ____________________</p>
      </div>
      <Sections list={d.guarantee.sections} />
      <div className="mt-8 grid grid-cols-2 gap-10"><div className="border-t pt-1 text-xs">Signed for {d.company.registeredName || d.company.name}</div><div className="border-t pt-1 text-xs">Date of practical completion</div></div>
    </Page>
  );
}

function Plan({ d }: { d: QuoteDocs }) {
  return (
    <Page d={d} title="Construction phase plan" subtitle="Construction (Design and Management) Regulations 2015">
      <Sections list={d.cpp} />
    </Page>
  );
}

function Rams({ d }: { d: QuoteDocs }) {
  return (
    <>
      <Page d={d} title="Risk assessment" subtitle="Risk = likelihood × severity (1–5 each): 1–7 low, 8–14 medium, 15–25 high">
        <table className="w-full table-fixed text-xs"><colgroup><col className="w-[22%]" /><col className="w-[17%]" /><col className="w-[6%]" /><col className="w-[49%]" /><col className="w-[6%]" /></colgroup>
          <thead><tr className="border-b text-left text-neutral-500"><th className="py-1 pr-2">Hazard</th><th className="pr-2">Who / harm</th><th>Before</th><th className="px-2">Control measures</th><th>After</th></tr></thead>
          <tbody>{d.risks.map(r => (
            <tr key={r.id} className="break-inside-avoid border-b align-top">
              <td className="py-1.5 pr-2 font-semibold">{r.title}<span className="block font-normal text-neutral-500">{r.activities.join(", ")}</span></td>
              <td className="pr-2">{r.who}<span className="block text-neutral-500">{r.harm}</span></td>
              <td><span className={`rounded px-1.5 font-semibold ${band(r.beforeBand)}`}>{r.before}</span></td>
              <td className="px-2"><ul className="list-disc pl-4">{r.controls.map((c, i) => <li key={i}>{c}</li>)}</ul></td>
              <td><span className={`rounded px-1.5 font-semibold ${band(r.afterBand)}`}>{r.after}</span></td>
            </tr>
          ))}</tbody></table>
        <p className="text-xs text-neutral-600">Assessed by: ____________________  Date: ____________  Reviewed when the work or conditions change, and briefed to all operatives before they start.</p>
      </Page>
      <Page d={d} title="Method statements" subtitle="How each part of the work will be carried out safely">
        {d.methods.map((m, i) => (
          <div key={m.id} className="break-inside-avoid rounded-lg border p-4">
            <h3 className="font-bold">{i + 1}. {m.title}</h3>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">{m.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3 print:grid-cols-3">
              <p><strong>Plant & equipment:</strong> {m.plant.join(", ")}</p><p><strong>PPE:</strong> {m.ppe.join(", ")}</p><p><strong>Competence:</strong> {m.competence}</p>
            </div>
            <p className="mt-1 text-xs text-neutral-600"><strong>Main hazards:</strong> {m.hazards.join("; ")}</p>
          </div>
        ))}
      </Page>
      <Page d={d} title="COSHH register" subtitle="Hazardous substances expected on site – safety data sheets kept on site">
        <table className="w-full text-xs"><tbody>{d.coshh.map(c => <tr key={c.activity} className="border-b align-top"><td className="py-1 pr-3 font-semibold">{c.activity}</td><td>{c.substances.join(" · ")}</td></tr>)}</tbody></table>
        <p className="text-xs text-neutral-600">Controls: read the product label and safety data sheet; gloves and eye protection; ventilate; store securely; wash hands before eating. See the risk assessment.</p>
      </Page>
    </>
  );
}
