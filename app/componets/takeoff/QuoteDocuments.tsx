import type { ReactNode } from "react";
import { longDate, workingDate, type DocSection, type QuoteDocs } from "@/app/lib/takeoff/documents";
import type { QuoteLayout } from "@/app/lib/takeoff/quote-format";

import { PACK_RENDER, packKinds, type PackKind } from "./ProjectPack";
import { Callout, Cover, Page, RiskBadge, RiskKey, RiskMatrix, SafetySigns, ScrollX, SectionTitle, Sections, Signatures, ZonePlan } from "./DocParts";

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
    <div className="space-y-8 text-[13px] leading-relaxed text-neutral-900 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:space-y-0">
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

/** Programme as a bar chart: one bar per stage over whole working days, week-commencing dates on top,
 *  bars coloured by part of the job, and the stage payments marked where they fall due. */
const PALETTE = ["#071a33", "#28508a", "#b07d00", "#2f7d6d", "#8a3b5c", "#5b4ea8", "#a35a1f", "#3f6f2a"];
const packOf = (stage: string) => stage.split(" · ")[0].trim();
const shortDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
function Gantt({ d }: { d: QuoteDocs }) {
  const rows = d.programme.filter(r => r.days > 0);
  const total = Math.max(1, ...rows.map(r => r.endDay + 1));
  const weeks = Math.ceil(total / 5);
  const step = weeks > 16 ? 4 : weeks > 8 ? 2 : 1;
  const pct = (day: number) => `${(day / total) * 100}%`;
  // Colour per part of the job (Site works grey); a key underneath.
  const packs = [...new Set(rows.map(r => packOf(r.stage)))];
  const colour = new Map(packs.filter(p => p !== "Site").map((p, i) => [p, PALETTE[i % PALETTE.length]] as const)).set("Site", "#7a8699");
  // Week-commencing date for each week (first working day of the week).
  const wc = (w: number) => d.start ? shortDay(workingDate(d.start, w * 5)) : "";
  const paidAfter = new Map<string, string>();
  for (const p of d.payments) if (p.kind === "STAGE" && p.stages?.length) paidAfter.set(p.stages[p.stages.length - 1], p.label);
  const labelMin = Math.max(2, Math.ceil(total / 22));
  return (
    <div className="mt-3 break-inside-avoid overflow-hidden rounded-lg border border-neutral-200">
      <div className="grid grid-cols-[34%_3rem_1fr] bg-[#071a33] text-[10px] font-bold uppercase tracking-wide text-white">
        <div className="px-2 py-1.5">Stage</div><div className="py-1.5 pr-2 text-right">Days</div>
        <div className="mr-5"><div className="relative h-8">{Array.from({ length: weeks }, (_, i) => i % step || (i > 0 && i * 5 / total > 0.88) ? null : (
          <span key={i} className="absolute top-1 whitespace-nowrap leading-tight" style={{ left: pct(i * 5) }}><span className="block">W{i + 1}</span>{d.start && <span className="block text-[9px] font-semibold normal-case text-white/65">{wc(i)}</span>}</span>))}</div></div>
      </div>
      {rows.map((r, i) => {
        const len = r.endDay - r.startDay + 1, pay = paidAfter.get(r.stage);
        return (
          <div key={r.stage} className={`grid grid-cols-[34%_3rem_1fr] items-center text-[11px] ${i % 2 ? "bg-neutral-50" : "bg-white"}`}>
            <div className="truncate px-2 py-1" title={r.label}>{r.label}</div>
            <div className="pr-2 text-right font-semibold tabular-nums text-neutral-700">{r.days}</div>
            <div className="mr-5"><div className="relative h-6">
              {Array.from({ length: weeks }, (_, w) => <span key={w} aria-hidden className="absolute inset-y-0 border-l border-neutral-200" style={{ left: pct(w * 5) }} />)}
              <span className="absolute top-1 flex h-4 items-center justify-center overflow-hidden rounded-sm text-[9px] font-bold text-white" style={{ left: pct(r.startDay), width: `max(6px, ${(len / total) * 100}%)`, background: colour.get(packOf(r.stage)) }}>{len >= labelMin ? `${len}d` : ""}</span>
              {pay && <span title={`${pay} due`} aria-label={`${pay} due`} className="absolute top-[7px] block h-2.5 w-2.5 rotate-45 bg-[#f5b400] ring-1 ring-[#071a33]/40" style={{ left: `calc(${pct(r.endDay + 1)} + 3px)` }} />}
            </div></div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-neutral-200 bg-white px-2 py-1.5 text-[10px] text-neutral-600">
        {packs.map(p => <span key={p} className="inline-flex items-center gap-1"><span aria-hidden className="h-2.5 w-4 rounded-sm" style={{ background: colour.get(p) }} />{p === "Site" ? "Site & testing" : p}</span>)}
        <span className="inline-flex items-center gap-1"><span aria-hidden className="h-2 w-2 rotate-45 bg-[#f5b400]" />Stage payment due</span>
        <span className="ml-auto">Whole working days, Mon–Fri{d.start ? `; W = week commencing${d.startProvisional ? " (provisional)" : ""}` : ""}</span>
      </div>
    </div>
  );
}

/** Payment schedule as a bar split by percentage. */
const PaymentBar = ({ d }: { d: QuoteDocs }) => (
  <div className="mt-3 flex h-6 overflow-hidden rounded-full ring-1 ring-black/10">
    {d.payments.map((p, i) => <div key={p.n} title={p.label} className={`flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-[#f5b400] text-neutral-950" : i === d.payments.length - 1 ? "bg-[#071a33] text-white" : i % 2 ? "bg-[#28508a] text-white" : "bg-[#3f6aa8] text-white"}`} style={{ width: `${p.percent}%` }}>{p.percent >= 7 ? `${p.percent.toFixed(0)}%` : ""}</div>)}
  </div>
);

/** What the client gets with us – all of it is promised in the contract terms. */
function WhyUs({ d }: { d: QuoteDocs }) {
  const c = d.company;
  const points: [string, string][] = [
    ["Fixed price", "The price is fixed for the works described – nothing extra without your written agreement."],
    [`${d.guarantee.years}-year guarantee`, "Our workmanship guarantee, plus the manufacturers' guarantees passed on to you."],
    ["One point of contact", c.siteManager ? `${c.siteManager} manages your project from start to handover.` : "A dedicated site manager runs your project from start to handover."],
    ["Safe, tidy site", "Full construction phase plan, risk assessments and daily clean-up; your home protected."],
    ["Certified & compliant", "Building Regulations, registered electricians and Gas Safe engineers; all certificates at handover."],
    ["Your online portal", "Track progress, photos, choices, invoices and snagging online, any time."],
  ];
  return (
    <div className="break-inside-avoid rounded-xl bg-[#071a33] p-5 text-white">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#f5b400]">Why {c.name}</p>
      <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-3 print:grid-cols-3">
        {points.map(([t, x]) => <div key={t}><p className="flex items-center gap-2 text-sm font-bold"><span aria-hidden className="h-2 w-2 rotate-45 bg-[#f5b400]" />{t}</p><p className="mt-0.5 text-[11.5px] leading-snug text-white/75">{x}</p></div>)}
      </div>
      {c.memberships && <p className="mt-4 border-t border-white/15 pt-2 text-[11px] text-[#f5b400]">{c.memberships}</p>}
    </div>
  );
}

function Quotation({ d }: { d: QuoteDocs }) {
  const titles = ["Description of the works", d.layout ? `Scope of works & price${d.layout.format === "ITEMISED" ? " – itemised" : ""}` : "Scope of works", "Programme",
    ...(d.layout ? [] : ["Price"]), "Payment schedule", ...(d.supplies.length ? ["Items supplied by you"] : []), "Not included", "Assumptions", "Acceptance"];
  const no = (t: string) => titles.findIndex(x => x.startsWith(t)) + 1;
  const quoteNo = `${d.reference}${d.version > 1 ? ` · v${d.version}` : ""}`;
  return (
    <>
      <Cover d={d} kind="Quotation" lead={d.description[1] ?? d.description[0]}
        meta={[["Quotation no.", quoteNo], ["Issued", longDate(d.issueDate)], ["Valid until", longDate(d.validUntil)], ...(d.start ? [[d.startProvisional ? "Provisional start" : "Planned start", longDate(d.start)] as [string, string]] : [])]}
        contents={titles} facts={[["Programme", `≈ ${d.weeks} week${d.weeks === 1 ? "" : "s"}`], ["Guarantee", `${d.guarantee.years} years`], ["Price ex VAT", gbp(d.price.net)], ["Total inc VAT", gbp(d.price.gross)]]} />
      <Page d={d} title="Quotation" meta={[["Quotation no.", quoteNo], ["Date", longDate(d.issueDate)], ["Valid until", longDate(d.validUntil)]]}>
        <Parties d={d} />

        {d.letter && <div className="space-y-2"><p>{d.letter.greeting}</p>{d.letter.paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>}

        <WhyUs d={d} />

        <div><SectionTitle n={no("Description")}>Description of the works</SectionTitle>{d.description.map((p, i) => <p key={i} className="mt-2">{p}</p>)}</div>

        {d.layout ? <ScopeTable layout={d.layout} price={d.price} n={no("Scope")} /> : <div><SectionTitle n={no("Scope")}>Scope of works</SectionTitle>
          <ol className="mt-2 space-y-3">{d.scope.map(s => (
            <li key={s.heading} className="break-inside-avoid"><p className="font-semibold">{s.heading}{s.dates && <span className="ml-2 text-xs font-normal text-neutral-500">{s.dates}</span>}</p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-5">{s.items.map((x, i) => <li key={i}>{x}</li>)}</ul></li>
          ))}</ol>
        </div>}

        <div className="break-inside-avoid"><SectionTitle n={no("Programme")}>Programme</SectionTitle>
          <p className="mt-2">{d.start ? <>{d.startProvisional ? "Provisional start" : "Start"} <strong>{longDate(d.start)}</strong>, practical completion around <strong>{longDate(d.finish!)}</strong> – </> : null}about {d.workingDays} working days (≈ {d.weeks} weeks), Monday to Friday excluding bank holidays.</p>
          <Gantt d={d} />
          <table className="mt-3 w-full text-xs"><thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1.5">Stage</th><th className="text-right">Days</th><th className="text-right">{d.start ? "Dates" : "When"}</th></tr></thead>
            <tbody>{d.programme.filter(r => r.days > 0).map(r => <tr key={r.stage} className="border-b border-neutral-100"><td className="py-1.5">{r.label}</td><td className="text-right tabular-nums text-neutral-700">{r.days}</td><td className="text-right text-neutral-700">{r.start ? (r.start === r.end ? longDate(r.start) : `${longDate(r.start)} – ${longDate(r.end!)}`) : dayRange(r.startDay, r.endDay)}</td></tr>)}</tbody></table>
          <p className="mt-1 text-[11px] text-neutral-500">The programme is our planned sequence; stages may overlap and dates move with weather, inspections and any changes you ask for.</p>
        </div>

        {!d.layout && <div className="break-inside-avoid"><SectionTitle n={no("Price")}>Price</SectionTitle>
          <table className="mt-2 w-full"><tbody>
            {d.price.areas.map(a => <tr key={a.area} className="border-b"><td className="py-1">{a.area}</td><td className="text-right">{gbp(a.net)}</td></tr>)}
            <tr><td className="pt-2 font-semibold">Total (ex VAT)</td><td className="pt-2 text-right font-semibold">{gbp(d.price.net)}</td></tr>
            {d.price.discount && <tr><td>Less: {d.price.discount.label}</td><td className="text-right">−{gbp(d.price.discount.amount)}</td></tr>}
            <tr><td>VAT</td><td className="text-right">{gbp(d.price.vat)}</td></tr>
            <tr className="text-base"><td className="font-black">Total including VAT</td><td className="text-right font-black">{gbp(d.price.gross)}</td></tr>
          </tbody></table>
        </div>}

        <div className="break-inside-avoid"><SectionTitle n={no("Payment")}>Payment schedule</SectionTitle>
          <PaymentBar d={d} />
          <ul className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-200 text-xs sm:hidden print:hidden">
            {d.payments.map(p => <li key={p.n} className="px-3 py-2"><div className="flex items-baseline justify-between gap-3"><span className="font-semibold">{p.n}. {p.label} <span className="font-normal text-neutral-500">{p.percent.toFixed(1)}%</span></span><span className="shrink-0 font-bold tabular-nums">{gbp(p.amount)}</span></div>
              <p className="text-neutral-600">{p.when}{p.date ? ` · expected ${longDate(p.date)}` : ""}</p></li>)}
            <li className="flex justify-between bg-neutral-50 px-3 py-2 font-black"><span>Total including VAT</span><span className="tabular-nums">{gbp(d.payments.reduce((s, p) => s + p.amount, 0))}</span></li>
          </ul>
          <table className="mt-3 hidden w-full table-fixed text-xs sm:table print:table"><colgroup><col className="w-[5%]" /><col className="w-[19%]" /><col className="w-[42%]" /><col className="w-[15%]" /><col className="w-[6%]" /><col className="w-[13%]" /></colgroup>
            <thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1.5">No.</th><th>Payment</th><th>Due when</th><th>Expected</th><th className="text-right">%</th><th className="text-right">Amount</th></tr></thead>
            <tbody>{d.payments.map(p => <tr key={p.n} className="border-b border-neutral-100 align-top"><td className="py-1.5 text-neutral-500">{p.n}</td><td className="pr-2 font-semibold">{p.label}</td><td className="pr-2 text-neutral-700">{p.when}</td><td className="pr-1">{p.date ? longDate(p.date) : "—"}</td><td className="text-right">{p.percent.toFixed(1)}</td><td className="text-right font-semibold tabular-nums">{gbp(p.amount)}</td></tr>)}
              <tr className="border-t-2 border-[#071a33]"><td colSpan={5} className="pt-1.5 text-right font-semibold">Total including VAT</td><td className="pt-1.5 text-right font-black tabular-nums">{gbp(d.payments.reduce((s, p) => s + p.amount, 0))}</td></tr></tbody></table>
          <div className="mt-2"><Callout title="Paying us safely">Each payment is invoiced when it falls due and is payable within {d.paymentDays} days by bank transfer{d.company.accountNumber ? ` to ${d.company.accountName || d.company.registeredName}, sort code ${d.company.sortCode}, account ${d.company.accountNumber}` : ""}. We will never change our bank details by email – always phone us to check.</Callout></div>
        </div>

        {d.supplies.length > 0 && <div><SectionTitle n={no("Items supplied")}>Items supplied by you</SectionTitle>
          <p className="mt-2 text-xs text-neutral-600">Not included in our price. Please order them to the specification below and have them on site by the date shown; quantities include an allowance for cuts. We are happy to advise before you buy.</p>
          <div className="mt-2"><ScrollX min={520}><table className="w-full text-xs"><thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1.5">Item</th><th>Specification</th><th className="text-right">Quantity</th><th className="pl-2">Needed</th></tr></thead>
            <tbody>{d.supplies.map((s, i) => <tr key={i} className="border-b border-neutral-100 align-top"><td className="py-1.5 pr-2">{s.item}<span className="block text-neutral-500">{s.area}</span></td><td className="pr-2">{s.spec || "—"}</td><td className="whitespace-nowrap text-right">{s.quantity} {s.unit}</td><td className="whitespace-nowrap pl-2">{s.neededBy}</td></tr>)}</tbody></table></ScrollX></div></div>}

        <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div><SectionTitle n={no("Not included")}>Not included</SectionTitle><ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">{d.exclusions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div><SectionTitle n={no("Assumptions")}>Assumptions</SectionTitle><ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">{d.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>

        <div className="break-inside-avoid"><SectionTitle n={no("Acceptance")}>Acceptance</SectionTitle>
          <p className="mt-2">This quotation is valid until <strong>{longDate(d.validUntil)}</strong>. It is subject to our contract terms, {d.guarantee.years}-year workmanship guarantee and the health &amp; safety documents provided with it. You can accept online in your client portal, or sign below and return a copy.</p>
          <div className="mt-4"><Signatures parties={[{ role: `For ${d.company.registeredName || d.company.name}`, signed: d.signer && { ...d.signer, date: d.issueDate } }, { role: "Client", name: d.client.name }]} /></div>
        </div>
      </Page>
    </>
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
      {/* Phones: stacked cards. Tablets, desktop and print: the table. */}
      <div className="mt-3 space-y-4 sm:hidden print:hidden">
        {L.groups.map((g, gi) => (
          <section key={g.key} className="overflow-hidden rounded-lg border border-neutral-200">
            <div className="flex items-baseline justify-between gap-3 bg-[#071a33] px-3 py-2 text-white"><h3 className="min-w-0 text-[13px] font-bold"><span className="mr-1.5 text-[#f5b400]">{gi + 1}</span>{g.title}</h3><span className="shrink-0 font-bold tabular-nums">{gbp(g.net)}</span></div>
            {g.text && <p className="px-3 pt-2 text-xs italic text-neutral-600">{g.text}</p>}
            <ul className="divide-y divide-neutral-100">{g.rows.map((r, ri) => (
              <li key={r.key} className="px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3"><p className="min-w-0 font-semibold text-[#071a33]"><span className="mr-1.5 text-neutral-400">{gi + 1}.{ri + 1}</span>{r.title}<Tags r={r} /></p><span className="shrink-0 font-semibold tabular-nums">{gbp(r.net)}</span></div>
                <p className="mt-0.5 text-[12.5px] text-neutral-800">{r.text}</p>
              </li>))}</ul>
          </section>
        ))}
      </div>
      <table className="mt-3 hidden w-full table-fixed sm:table print:table">
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
            <div className="flex items-baseline justify-between gap-3 rounded-md bg-[#071a33] px-3 py-1.5 text-white"><h3 className="min-w-0 text-[13px] font-bold"><span className="mr-2 text-[#f5b400]">{gi + 1}</span>{g.title}</h3><span className="font-bold tabular-nums">{gbp(g.net)}</span></div>
            {g.text && <p className="mt-2 text-xs italic text-neutral-600">{g.text}</p>}
            <div className="mt-2 divide-y divide-neutral-200">
              {g.rows.map((r, ri) => (
                <div key={r.key} className="break-inside-avoid py-3">
                  <div className="flex items-baseline justify-between gap-3"><p className="min-w-0 font-semibold text-[#071a33]"><span className="mr-2 text-neutral-400">{gi + 1}.{ri + 1}</span>{r.title}<Tags r={r} /></p><span className="shrink-0 font-semibold tabular-nums">{gbp(r.net)}</span></div>
                  <p className="mt-0.5 text-neutral-800 sm:pl-8">{r.text}</p>
                  {L.format === "NORMAL" && r.items && r.items.length > 0 && (
                    <ul className="mt-1.5 grid gap-x-6 text-xs text-neutral-600 sm:grid-cols-2 sm:pl-8 print:grid-cols-2">
                      {r.items.map(i => <li key={i.id} className="flex justify-between gap-2 border-b border-dotted border-neutral-300 py-0.5"><span>{i.description}{i.byClient ? " (supplied by you)" : ""}</span><span className="whitespace-nowrap">{qty(i.quantity, i.unit)}</span></li>)}
                    </ul>
                  )}
                  {L.format === "ITEMISED" && r.items && r.items.length > 0 && (
                    <div className="mt-1.5 sm:ml-8"><ScrollX min={420}><table className="w-full table-fixed text-xs">
                      <colgroup><col className="w-[55%]" /><col className="w-[15%]" /><col className="w-[14%]" /><col className="w-[16%]" /></colgroup>
                      <thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1 font-semibold">Item</th><th className="text-right font-semibold">Quantity</th><th className="text-right font-semibold">Rate</th><th className="text-right font-semibold">Amount</th></tr></thead>
                      <tbody>{[...r.items].sort((a, b) => (a.kind === "LABOUR" ? 1 : 0) - (b.kind === "LABOUR" ? 1 : 0)).map(i => (
                        <tr key={i.id} className="border-b border-neutral-100 align-top"><td className="py-1 pr-2">{i.description}{i.kind === "LABOUR" && <span className="ml-1.5 rounded bg-neutral-100 px-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-500">Labour</span>}</td><td className="whitespace-nowrap text-right">{qty(i.quantity, i.unit)}</td>
                          <td className="whitespace-nowrap text-right tabular-nums">{i.byClient ? "—" : gbp(i.rate ?? 0)}</td><td className="whitespace-nowrap text-right tabular-nums">{i.byClient ? <span className="text-neutral-500">By you</span> : gbp(i.net ?? 0)}</td></tr>
                      ))}</tbody>
                    </table></ScrollX></div>
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

/** Contract: cover with contents, particulars, numbered clauses (1.1, 1.2…), the documents that form the contract, signatures. */
function Contract({ d }: { d: QuoteDocs }) {
  const co = d.company.registeredName || d.company.name;
  const deposit = d.payments[0];
  const particulars: [string, string][] = [
    ["Contractor", `${co}${d.company.companyNo ? ` (company no. ${d.company.companyNo})` : ""}`], ["Client", d.client.name || "—"], ["Site", d.client.siteAddress || "—"],
    ["The works", `${d.title} – quotation ${d.reference}${d.version > 1 ? ` v${d.version}` : ""} dated ${longDate(d.issueDate)}`],
    ["Contract sum", `${gbp(d.price.net)} + VAT = ${gbp(d.price.gross)}`], ["Deposit", deposit ? `${gbp(deposit.amount)} (${deposit.percent.toFixed(0)}%) on signing` : "—"],
    ["Start", d.start ? longDate(d.start) : "To be confirmed in writing"], ["Completion", d.finish ? `On or around ${longDate(d.finish)} (${d.workingDays} working days)` : `About ${d.workingDays} working days after starting`],
    ["Payment terms", `${d.paymentDays} days from invoice`], ["Working hours", d.company.workingHours || "08:00–17:30 Monday to Friday"],
    ["Site manager", d.company.siteManager ? `${d.company.siteManager}${d.company.siteManagerPhone ? ` · ${d.company.siteManagerPhone}` : ""}` : "Named at the pre-start meeting"],
    ["Workmanship guarantee", `${d.guarantee.years} years from practical completion`], ["Disputes", d.company.disputeScheme || "Independent mediation"],
  ];
  const clauses = d.contract.map(s => { const m = s.heading.match(/^(\d+)\.\s*(.*)$/); return { s, no: m?.[1] ?? "", heading: m?.[2] ?? s.heading }; });
  return (
    <>
      <Cover d={d} kind="Contract for building works" lead="Consumer building contract: the particulars, the terms that protect us both, and the documents that form the contract."
        contents={["Contract particulars", ...clauses.map(c => c.heading), "Documents forming this contract", "Signed"].slice(0, 30)}
        facts={[["Contract sum inc VAT", gbp(d.price.gross)]]} />
      <Page d={d} title="Contract for building works" subtitle="Consumer building contract – particulars and terms">
        <div><SectionTitle>Contract particulars</SectionTitle>
          <table className="mt-2 w-full overflow-hidden rounded-lg text-sm"><tbody>{particulars.map(([k, v], i) => <tr key={k} className={`align-top ${i % 2 ? "bg-neutral-50" : ""}`}><td className="w-28 px-2 py-1.5 pr-3 text-neutral-500 sm:w-44">{k}</td><td className="py-1.5 pr-2 font-medium text-[#071a33]">{v}</td></tr>)}</tbody></table>
        </div>
        <Callout tone="navy" title="Your key rights at a glance">You can cancel within 14 days of signing (clause {clauses.find(c => /cancel/i.test(c.heading))?.no ?? "—"}); nothing extra is charged without your written agreement (clause {clauses.find(c => /Variation/i.test(c.heading))?.no ?? "—"}); our workmanship is guaranteed for {d.guarantee.years} years; and your rights under the Consumer Rights Act 2015 are not affected.</Callout>
        <div className="space-y-5">
          {clauses.map(({ s, no, heading }) => (
            <div key={s.heading} className="break-inside-avoid">
              <h3 className="flex items-center gap-2 border-b border-neutral-200 pb-1 font-bold text-[#071a33] sm:gap-3"><span className="flex h-6 w-8 shrink-0 items-center justify-center rounded bg-[#071a33] text-[11px] font-black text-[#f5b400]">{no}</span>{heading}</h3>
              {s.paragraphs?.map((p, i) => <p key={i} className="mt-1.5 flex gap-2 sm:gap-3"><span className="w-8 shrink-0 text-right text-[11px] font-semibold text-neutral-400">{no}.{i + 1}</span><span>{p}</span></p>)}
              {s.items?.map((x, i) => <p key={i} className="mt-1.5 flex gap-2 sm:gap-3"><span className="w-8 shrink-0 text-right text-[11px] font-semibold text-neutral-400">{no}.{(s.paragraphs?.length ?? 0) + i + 1}</span><span>{x}</span></p>)}
            </div>
          ))}
        </div>
        <div className="break-inside-avoid"><SectionTitle>Documents forming this contract</SectionTitle>
          <ol className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2 print:grid-cols-2">
            {["These contract particulars and terms", `Quotation ${d.reference} with its scope of works, programme, payment schedule, client supplies, exclusions and assumptions`, `${d.guarantee.years}-year workmanship guarantee`, "Construction phase plan, risk assessments, method statements and site zone plan", "Cancellation form", "Any variation agreed in writing (variation order form or the client portal)"]
              .map((x, i) => <li key={i} className="flex gap-2 rounded-md border border-neutral-200 p-2"><span className="font-black text-[#b07f00]">{String.fromCharCode(65 + i)}</span><span>{x}</span></li>)}
          </ol>
        </div>
        <div className="break-inside-avoid"><SectionTitle>Signed</SectionTitle>
          <p className="mt-2 text-xs text-neutral-600">By signing, both parties agree to these terms. Accepting the quotation in the client portal has the same effect.</p>
          <div className="mt-4"><Signatures parties={[{ role: `For ${co}`, signed: d.signer && { ...d.signer, date: d.issueDate } }, { role: "Client", name: d.client.name }]} /></div>
        </div>
      </Page>
    </>
  );
}

/** The cancellation form is its own document. */
function Cancellation({ d }: { d: QuoteDocs }) {
  return (
    <Page d={d} title="Cancellation form" subtitle="Complete and return this form only if you wish to cancel within 14 days">
      <Callout title="Your right to cancel">Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 – model cancellation form. You may also tell us by email or in writing; you do not have to give a reason.</Callout>
      <div className="space-y-5 rounded-xl border-2 border-dashed border-neutral-300 p-5">{d.cancellationForm.map((x, i) => <p key={i} className="border-b border-neutral-200 pb-3 [overflow-wrap:anywhere]">{x}</p>)}</div>
    </Page>
  );
}

function Guarantee({ d }: { d: QuoteDocs }) {
  return (
    <Page d={d} title={`${d.guarantee.years}-year workmanship guarantee`}>
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-[#f5b400] p-1">
        <div className="rounded-xl border border-[#f5b400]/60 bg-[radial-gradient(circle_at_top,#fffbeb,white_70%)] px-6 py-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#b07f00]">Certificate of guarantee</p>
          <p className="mt-2 text-3xl font-black text-[#071a33]">{d.guarantee.years}-Year Workmanship Guarantee</p>
          <div className="mx-auto mt-3 h-0.5 w-24 bg-[#f5b400]" />
          <p className="mt-3">Issued to <strong>{d.client.name || "the client"}</strong> for the works at <strong>{d.client.siteAddress || "the property"}</strong> (contract {d.reference}).</p>
          <p className="mt-1 text-neutral-600">Valid for {d.guarantee.years} years from the date of practical completion: ____________________</p>
          <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-double border-[#071a33] text-center text-[10px] font-black uppercase leading-tight text-[#071a33]">{d.guarantee.years} year<br />guarantee</div>
        </div>
      </div>
      <Sections list={d.guarantee.sections} />
      <div className="mt-8"><Signatures parties={[{ role: `Signed for ${d.company.registeredName || d.company.name}`, signed: d.signer && { ...d.signer, date: undefined } }, { role: "Date of practical completion" }]} /></div>
    </Page>
  );
}

function Plan({ d }: { d: QuoteDocs }) {
  return (
    <>
      <Cover d={d} kind="Health & safety" safety lead="Construction phase plan under the Construction (Design and Management) Regulations 2015: how the site is organised, the people responsible, the danger zones and the rules everyone follows."
        contents={[...d.cpp.map(s => s.heading.replace(/^\d+\.\s*/, "")), ...(d.zones ? ["Site zones – red, amber, green", "Safety signs on this site"] : [])]}
        facts={[["Activities", String(d.methods.length)], ["Hazards assessed", String(d.risks.length)], ["High before controls", String(d.risks.filter(r => r.beforeBand === "High").length)], ["High after controls", String(d.risks.filter(r => r.afterBand === "High").length)]]} />
      <Page d={d} title="Construction phase plan" subtitle="Construction (Design and Management) Regulations 2015" accent="safety">
        <Sections list={d.cpp} />
        {d.zones && <div><SectionTitle n={d.cpp.length + 1}>Site zones – red, amber, green</SectionTitle><p className="mt-2 text-xs text-neutral-600">Every area of the job is marked on site with barriers, tape and signs in these colours. Please keep children, pets and visitors out of red and amber areas.</p><div className="mt-3"><ZonePlan zones={d.zones} /></div></div>}
        {d.signs && <div><SectionTitle n={d.cpp.length + 2}>Safety signs on this site</SectionTitle><div className="mt-3"><SafetySigns signs={d.signs} /></div></div>}
      </Page>
    </>
  );
}

function Rams({ d }: { d: QuoteDocs }) {
  const high = d.risks.filter(r => r.beforeBand === "High").length;
  return (
    <>
      <Page d={d} title="Risk assessment" subtitle="Risk = likelihood × severity (1–5 each): 1–7 low, 8–14 medium, 15–25 high" accent="safety">
        <RiskKey />
        {d.risks.some(r => r.beforeLS) && <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <RiskMatrix title="Before controls" points={d.risks.filter(r => r.beforeLS).map(r => r.beforeLS!)} />
          <RiskMatrix title="After controls (residual risk)" points={d.risks.filter(r => r.afterLS).map(r => r.afterLS!)} />
        </div>}
        <Callout tone={high ? "red" : "green"} title="Summary">{d.risks.length} hazards assessed across {d.methods.length} activities; {high} rated high before controls and {d.risks.filter(r => r.afterBand === "High").length} after. Where severity stays high (for example falls or collapse) the work goes ahead only under the permit, supervision and exclusion zone shown.</Callout>
        <ScrollX min={680}><table className="w-full table-fixed text-xs"><colgroup><col className="w-[22%]" /><col className="w-[17%]" /><col className="w-[9%]" /><col className="w-[43%]" /><col className="w-[9%]" /></colgroup>
          <thead><tr className="bg-[#071a33] text-left text-[10px] uppercase tracking-wide text-white"><th className="px-2 py-1.5">Hazard</th><th className="pr-2">Who / harm</th><th>Before</th><th className="px-2">Control measures</th><th>After</th></tr></thead>
          <tbody>{d.risks.map((r, i) => (
            <tr key={r.id} className={`break-inside-avoid border-b align-top ${i % 2 ? "bg-neutral-50" : ""}`}>
              <td className={`border-l-4 px-2 py-1.5 font-semibold ${r.beforeBand === "High" ? "border-red-600" : r.beforeBand === "Medium" ? "border-amber-400" : "border-emerald-600"}`}>{r.title}<span className="block font-normal text-neutral-500">{r.activities.join(", ")}</span></td>
              <td className="py-1.5 pr-2">{r.who}<span className="block text-neutral-500">{r.harm}</span></td>
              <td className="py-1.5"><RiskBadge score={r.before} label={r.beforeBand} /></td>
              <td className="px-2 py-1.5"><ul className="list-disc pl-4">{r.controls.map((c, j) => <li key={j}>{c}</li>)}</ul></td>
              <td className="py-1.5"><RiskBadge score={r.after} label={r.afterBand} /></td>
            </tr>
          ))}</tbody></table></ScrollX>
        <p className="text-xs text-neutral-600">Assessed by: ____________________  Date: ____________  Reviewed when the work or conditions change, and briefed to all operatives before they start.</p>
      </Page>
      <Page d={d} title="Method statements" subtitle="How each part of the work will be carried out safely" accent="safety">
        {d.methods.map((m, i) => (
          <div key={m.id} className="break-inside-avoid overflow-hidden rounded-lg border">
            <h3 className="flex items-center gap-2 bg-[#071a33] px-4 py-2 font-bold text-white"><span className="text-[#f5b400]">{String(i + 1).padStart(2, "0")}</span>{m.title}</h3>
            <div className="p-4">
              <ol className="list-decimal space-y-0.5 pl-5">{m.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3 print:grid-cols-3">
                <p className="rounded bg-neutral-50 p-2"><strong className="block text-[10px] uppercase tracking-wide text-neutral-500">Plant & equipment</strong>{m.plant.join(", ")}</p>
                <p className="rounded bg-blue-50 p-2"><strong className="block text-[10px] uppercase tracking-wide text-blue-800">PPE (mandatory)</strong>{m.ppe.join(", ")}</p>
                <p className="rounded bg-neutral-50 p-2"><strong className="block text-[10px] uppercase tracking-wide text-neutral-500">Competence</strong>{m.competence}</p>
              </div>
              <p className="mt-2 rounded border-l-4 border-amber-400 bg-amber-50 p-2 text-xs"><strong>Main hazards:</strong> {m.hazards.join("; ")}</p>
            </div>
          </div>
        ))}
      </Page>
      <Page d={d} title="COSHH register" subtitle="Hazardous substances expected on site – safety data sheets kept on site" accent="safety">
        <table className="w-full text-xs"><thead><tr className="bg-[#071a33] text-left text-[10px] uppercase tracking-wide text-white"><th className="px-2 py-1.5">Activity</th><th>Substances</th></tr></thead>
          <tbody>{d.coshh.map((c, i) => <tr key={c.activity} className={`border-b align-top ${i % 2 ? "bg-neutral-50" : ""}`}><td className="px-2 py-1.5 font-semibold">{c.activity}</td><td className="py-1.5">{c.substances.map(s => <span key={s} className="mb-1 mr-1 inline-block rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5">{s}</span>)}</td></tr>)}</tbody></table>
        <Callout title="Controls">Read the product label and safety data sheet; gloves and eye protection; ventilate; store securely; wash hands before eating. See the risk assessment.</Callout>
      </Page>
    </>
  );
}
