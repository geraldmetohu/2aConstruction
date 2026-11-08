import type { ReactNode } from "react";
import { longDate, type DocSection, type QuoteDocs } from "@/app/lib/takeoff/documents";
import type { QuoteLayout } from "@/app/lib/takeoff/quote-format";

export type DocKind = "quote" | "contract" | "guarantee" | "cpp" | "rams";
export const docKinds: [DocKind, string][] = [
  ["quote", "Quotation"], ["contract", "Contract"], ["guarantee", "Workmanship guarantee"], ["cpp", "Construction phase plan"], ["rams", "Risk assessment & method statements"],
];

const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const band = (b: string) => (b === "High" ? "bg-red-100 text-red-800" : b === "Medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800");

/** The client document pack. Printable: each document starts on a new page. No costs, rates or margins. */
export function QuoteDocuments({ docs: d, show }: { docs: QuoteDocs; show: DocKind[] }) {
  return (
    <div className="space-y-8 text-[13px] leading-relaxed text-neutral-900 print:space-y-0">
      {show.includes("quote") && <Quotation d={d} />}
      {show.includes("contract") && <Contract d={d} />}
      {show.includes("guarantee") && <Guarantee d={d} />}
      {show.includes("cpp") && <Plan d={d} />}
      {show.includes("rams") && <Rams d={d} />}
    </div>
  );
}

function Page({ d, title, subtitle, children }: { d: QuoteDocs; title: string; subtitle?: string; children: ReactNode }) {
  const c = d.company;
  return (
    <section className="mx-auto max-w-[210mm] break-before-page overflow-x-auto rounded-xl border bg-white px-4 py-6 shadow-sm sm:px-10 sm:py-9 print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none">
      <header className="flex items-start justify-between gap-6 border-b-2 border-amber-400 pb-5">
        <div>
          {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="h-16 w-auto" /> : <p className="text-2xl font-black">{c.name}</p>}
        </div>
        <div className="text-right text-xs text-neutral-600">
          <p className="text-sm font-bold text-neutral-900">{c.registeredName || c.name}</p>
          {c.address && <p className="whitespace-pre-line">{c.address}</p>}
          <p>{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
          {c.website && <p>{c.website}</p>}
        </div>
      </header>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">{title}</p><h1 className="mt-1 text-2xl font-black">{d.title}</h1>{subtitle && <p className="text-neutral-600">{subtitle}</p>}</div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 text-xs">
          <dt className="text-neutral-500">Reference</dt><dd className="font-semibold">{d.reference}{d.version > 1 ? ` v${d.version}` : ""}</dd>
          <dt className="text-neutral-500">Date</dt><dd className="font-semibold">{longDate(d.issueDate)}</dd>
        </dl>
      </div>
      <div className="mt-6 space-y-6">{children}</div>
      <footer className="mt-10 border-t pt-3 text-[10px] text-neutral-500">
        {c.registeredName || c.name}{c.companyNo ? ` · Registered in England & Wales no. ${c.companyNo}` : ""}{c.vatNo ? ` · VAT ${c.vatNo}` : ""}{c.memberships ? ` · ${c.memberships}` : ""}
      </footer>
    </section>
  );
}

const H = ({ children }: { children: ReactNode }) => <h2 className="border-b pb-1 text-base font-bold">{children}</h2>;
const Sections = ({ list }: { list: DocSection[] }) => (
  <>{list.map(s => (
    <div key={s.heading} className="break-inside-avoid">
      <h3 className="font-bold">{s.heading}</h3>
      {s.paragraphs?.map((p, i) => <p key={i} className="mt-1">{p}</p>)}
      {s.items && <ul className="mt-1 list-disc space-y-0.5 pl-5">{s.items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </div>
  ))}</>
);
const Parties = ({ d }: { d: QuoteDocs }) => (
  <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
    <div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs font-bold uppercase text-neutral-500">Prepared for</p><p className="font-semibold">{d.client.name || "—"}</p>
      {d.client.address && <p className="whitespace-pre-line">{d.client.address}</p>}<p className="text-neutral-600">{[d.client.email, d.client.phone].filter(Boolean).join(" · ")}</p></div>
    <div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs font-bold uppercase text-neutral-500">Site address</p><p className="whitespace-pre-line">{d.client.siteAddress || "—"}</p>
      <p className="mt-1 text-neutral-600">Valid until {longDate(d.validUntil)}</p></div>
  </div>
);

function Quotation({ d }: { d: QuoteDocs }) {
  return (
    <Page d={d} title="Quotation">
      <Parties d={d} />
      {d.letter && <div><p>{d.letter.greeting}</p>{d.letter.paragraphs.map((p, i) => <p key={i} className="mt-2 whitespace-pre-line">{p}</p>)}</div>}
      <div><H>Description of the works</H>{d.description.map((p, i) => <p key={i} className="mt-2">{p}</p>)}</div>

      {d.layout ? <ScopeTable layout={d.layout} price={d.price} /> : <div><H>Scope of works (in order)</H>
        <ol className="mt-2 space-y-3">{d.scope.map(s => (
          <li key={s.heading} className="break-inside-avoid"><p className="font-semibold">{s.heading}{s.dates && <span className="ml-2 text-xs font-normal text-neutral-500">{s.dates}</span>}</p>
            <ul className="mt-0.5 list-disc space-y-0.5 pl-5">{s.items.map((x, i) => <li key={i}>{x}</li>)}</ul></li>
        ))}</ol>
      </div>}

      <div className="break-inside-avoid"><H>Programme</H>
        <p className="mt-1">{d.start ? <>Start <strong>{longDate(d.start)}</strong>, practical completion around <strong>{longDate(d.finish!)}</strong> – </> : null}about {d.workingDays} working days (≈ {d.weeks} weeks), Monday to Friday excluding bank holidays.</p>
        <table className="mt-2 w-full text-xs"><thead><tr className="border-b text-left text-neutral-500"><th className="py-1">Stage</th><th>{d.start ? "Dates" : "Working days"}</th></tr></thead>
          <tbody>{d.programme.filter(r => r.days > 0).map(r => <tr key={r.stage} className="border-b"><td className="py-1">{r.label}</td><td>{r.start ? (r.start === r.end ? longDate(r.start) : `${longDate(r.start)} – ${longDate(r.end!)}`) : `Day ${r.startDay + 1}${r.endDay > r.startDay ? `–${r.endDay + 1}` : ""}`}</td></tr>)}</tbody></table>
      </div>

      {!d.layout && <div className="break-inside-avoid"><H>Price</H>
        <table className="mt-2 w-full"><tbody>
          {d.price.areas.map(a => <tr key={a.area} className="border-b"><td className="py-1">{a.area}</td><td className="text-right">{gbp(a.net)}</td></tr>)}
          <tr><td className="pt-2 font-semibold">Total (ex VAT)</td><td className="pt-2 text-right font-semibold">{gbp(d.price.net)}</td></tr>
          {d.price.discount && <tr><td>Less: {d.price.discount.label}</td><td className="text-right">−{gbp(d.price.discount.amount)}</td></tr>}
          <tr><td>VAT</td><td className="text-right">{gbp(d.price.vat)}</td></tr>
          <tr className="text-base"><td className="font-black">Total including VAT</td><td className="text-right font-black">{gbp(d.price.gross)}</td></tr>
        </tbody></table>
        <p className="mt-2 text-xs text-neutral-600">By part of the job: {d.price.phases.map(p => `${p.label} ${gbp(p.total)}`).join(" · ")} (ex VAT). Scaffolding: <strong>{d.price.scaffolding ? "included" : "not included"}</strong>.</p>
      </div>}

      <div className="break-inside-avoid"><H>Payment schedule</H>
        <table className="mt-2 w-full table-fixed text-xs"><colgroup><col className="w-[4%]" /><col className="w-[16%]" /><col className="w-[44%]" /><col className="w-[16%]" /><col className="w-[7%]" /><col className="w-[13%]" /></colgroup><thead><tr className="border-b text-left text-neutral-500"><th className="py-1">#</th><th>Payment</th><th>When</th><th>Due date</th><th className="text-right">%</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{d.payments.map(p => <tr key={p.n} className="border-b align-top"><td className="py-1">{p.n}</td><td className="pr-2 font-semibold">{p.label}</td><td className="pr-2">{p.when}</td><td className="whitespace-nowrap">{p.date ? longDate(p.date) : "—"}</td><td className="text-right">{p.percent.toFixed(1)}</td><td className="text-right font-semibold">{gbp(p.amount)}</td></tr>)}
            <tr><td colSpan={5} className="pt-1 text-right font-semibold">Total</td><td className="pt-1 text-right font-bold">{gbp(d.payments.reduce((s, p) => s + p.amount, 0))}</td></tr></tbody></table>
        <p className="mt-1 text-xs text-neutral-600">Invoices are payable within {d.paymentDays} days by bank transfer{d.company.accountNumber ? ` to ${d.company.accountName || d.company.registeredName}, sort code ${d.company.sortCode}, account ${d.company.accountNumber}` : ""}. Dates follow the programme and move with it.</p>
      </div>

      {d.supplies.length > 0 && <div><H>Items you supply</H>
        <p className="mt-1 text-xs text-neutral-600">These are not in our price. Please order them to the specification below and have them on site by the date shown; quantities include an allowance for cuts. We are happy to advise before you buy.</p>
        <table className="mt-2 w-full text-xs"><thead><tr className="border-b text-left text-neutral-500"><th className="py-1">Area</th><th>Item</th><th>Specification</th><th className="text-right">Quantity</th><th>Needed</th></tr></thead>
          <tbody>{d.supplies.map((s, i) => <tr key={i} className="border-b align-top"><td className="py-1 pr-2">{s.area}</td><td className="pr-2">{s.item}</td><td className="pr-2">{s.spec || "—"}</td><td className="whitespace-nowrap text-right">{s.quantity} {s.unit}</td><td className="whitespace-nowrap pl-2">{s.neededBy}</td></tr>)}</tbody></table></div>}

      <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        <div><H>Not included</H><ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">{d.exclusions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        <div><H>Assumptions</H><ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">{d.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      </div>

      <div className="break-inside-avoid"><H>Acceptance</H>
        <p className="mt-1">This quotation is valid until {longDate(d.validUntil)} and is subject to our contract terms, {d.guarantee.years}-year workmanship guarantee and the health & safety documents provided with it. You can accept online in your client portal or sign below.</p>
        <div className="mt-8 grid grid-cols-2 gap-10"><div className="border-t pt-1 text-xs">Signed for {d.company.registeredName || d.company.name}</div><div className="border-t pt-1 text-xs">Client signature, name &amp; date</div></div>
      </div>
    </Page>
  );
}

const Tags = ({ r }: { r: { vatPercent?: number; provisional?: boolean } }) => <>
  {r.provisional && <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">Provisional sum</span>}
  {r.vatPercent !== undefined && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-800">{r.vatPercent}% VAT</span>}
</>;
const qty = (q: number, unit: string) => `${Number(q.toFixed(2))} ${unit}`;

/** Scope of works with prices, in the format chosen for this client. */
export function ScopeTable({ layout: L, price: p }: { layout: QuoteLayout; price: QuoteDocs["price"] }) {
  let n = 0;
  const vb = p.vatBreakdown && p.vatBreakdown.length > 1 ? p.vatBreakdown : null;
  const totals = (
    <table className="mt-3 w-full break-inside-avoid"><tbody>
      {p.discount && <><tr className="border-t-2 border-neutral-900"><td className="pt-2">Subtotal</td><td className="pt-2 text-right">{gbp(p.discount.netBeforeDiscount)}</td></tr>
        <tr><td>Less: {p.discount.label}</td><td className="text-right">−{gbp(p.discount.amount)}</td></tr></>}
      <tr className={p.discount ? "" : "border-t-2 border-neutral-900"}><td className="pt-2 font-semibold">Total (ex VAT)</td><td className="pt-2 text-right font-semibold">{gbp(p.net)}</td></tr>
      {vb ? vb.map(v => <tr key={v.percent}><td>VAT at {v.percent}% on {gbp(v.net)}</td><td className="text-right">{gbp(v.vat)}</td></tr>) : <tr><td>VAT</td><td className="text-right">{gbp(p.vat)}</td></tr>}
      <tr className="text-base"><td className="font-black">Total including VAT</td><td className="text-right font-black">{gbp(p.gross)}</td></tr>
    </tbody></table>
  );
  const extras = (
    <>
      {L.options.length > 0 && <div className="mt-5 break-inside-avoid"><h3 className="font-bold">Optional extras{L.options.some(o => o.chosen) ? "" : " (not included in the price above)"}</h3>
        <table className="mt-1 w-full text-xs"><tbody>{L.options.map((o, i) => <tr key={i} className="border-b"><td className="py-1">{o.title}</td><td className="text-right">{o.chosen ? "Added – included above" : o.price != null ? `${gbp(o.price)} + VAT` : "Price on request"}</td></tr>)}</tbody></table></div>}
      {L.notes && <div className="mt-5 break-inside-avoid rounded-lg bg-amber-50 p-3"><h3 className="font-bold">Notes &amp; provisional sums</h3><p className="mt-1 whitespace-pre-line">{L.notes}</p></div>}
    </>
  );

  if (L.format === "SIMPLE") return (
    <div><H>Scope of works &amp; price</H>
      <table className="mt-2 w-full table-fixed">
        <colgroup><col className="w-[6%]" /><col className="w-[22%]" /><col className="w-[56%]" /><col className="w-[16%]" /></colgroup>
        <thead><tr className="border-b-2 border-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-500"><th className="py-1.5">No.</th><th>Activity</th><th>Description of works</th><th className="text-right">Cost (ex VAT)</th></tr></thead>
        {L.groups.map(g => (
          <tbody key={g.key} className="break-inside-avoid">
            <tr className="bg-neutral-100"><td colSpan={3} className="px-2 py-1.5 font-bold">{g.title}</td><td className="px-2 text-right font-bold">{gbp(g.net)}</td></tr>
            {g.text && <tr><td /><td colSpan={3} className="py-1 pr-2 text-xs italic text-neutral-600">{g.text}</td></tr>}
            {g.rows.map(r => (
              <tr key={r.key} className="border-b align-top"><td className="py-2 text-neutral-500">{++n}</td><td className="py-2 pr-3 font-semibold">{r.title}<Tags r={r} /></td><td className="py-2 pr-3">{r.text}</td><td className="py-2 text-right font-semibold tabular-nums">{gbp(r.net)}</td></tr>
            ))}
          </tbody>
        ))}
      </table>
      {totals}{extras}
    </div>
  );

  return (
    <div><H>Scope of works &amp; price{L.format === "ITEMISED" ? " – itemised" : ""}</H>
      <div className="mt-3 space-y-5">
        {L.groups.map(g => (
          <section key={g.key}>
            <div className="flex items-baseline justify-between gap-3 border-b-2 border-neutral-900 pb-1"><h3 className="text-sm font-black uppercase tracking-wide">{g.title}</h3><span className="font-bold tabular-nums">{gbp(g.net)}</span></div>
            {g.text && <p className="mt-1 text-xs italic text-neutral-600">{g.text}</p>}
            <div className="mt-2 space-y-3">
              {g.rows.map(r => (
                <div key={r.key} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-3"><p className="font-semibold"><span className="mr-2 text-neutral-400">{++n}.</span>{r.title}<Tags r={r} />{r.trade && <span className="ml-2 text-[11px] font-normal text-neutral-500">{r.trade}</span>}</p><span className="font-semibold tabular-nums">{gbp(r.net)}</span></div>
                  <p className="mt-0.5 pl-6">{r.text}</p>
                  {L.format === "NORMAL" && r.items && r.items.length > 0 && (
                    <ul className="mt-1 grid gap-x-6 pl-6 text-xs text-neutral-600 sm:grid-cols-2 print:grid-cols-2">
                      {r.items.map(i => <li key={i.id} className="flex justify-between gap-2 border-b border-dotted py-0.5"><span>{i.description}{i.byClient ? " (supplied by you)" : ""}</span><span className="whitespace-nowrap">{qty(i.quantity, i.unit)}</span></li>)}
                    </ul>
                  )}
                  {L.format === "ITEMISED" && r.items && r.items.length > 0 && (
                    <table className="mt-1 ml-6 w-[calc(100%-1.5rem)] text-xs">
                      <thead><tr className="border-b text-left text-neutral-500"><th className="py-0.5 font-medium">Item</th><th className="text-right font-medium">Qty</th><th className="text-right font-medium">Rate</th><th className="text-right font-medium">Amount</th></tr></thead>
                      <tbody>{r.items.map(i => (
                        <tr key={i.id} className="border-b border-dotted"><td className="py-0.5 pr-2">{i.description}{i.kind === "LABOUR" ? "" : ""}</td><td className="whitespace-nowrap text-right">{qty(i.quantity, i.unit)}</td>
                          <td className="whitespace-nowrap text-right">{i.byClient ? "—" : gbp(i.rate ?? 0)}</td><td className="whitespace-nowrap text-right">{i.byClient ? "Supplied by you" : gbp(i.net ?? 0)}</td></tr>
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

function Contract({ d }: { d: QuoteDocs }) {
  return (
    <>
      <Page d={d} title="Contract for building works" subtitle="Consumer building contract – terms and conditions">
        <Parties d={d} />
        <Sections list={d.contract} />
        <div className="break-inside-avoid"><H>Signatures</H>
          <div className="mt-8 grid grid-cols-2 gap-10"><div className="border-t pt-1 text-xs">For {d.company.registeredName || d.company.name} – name, signature, date</div><div className="border-t pt-1 text-xs">Client – name, signature, date</div></div></div>
      </Page>
      <Page d={d} title="Cancellation form" subtitle="Complete and return this form only if you wish to cancel within 14 days">
        <div className="space-y-4">{d.cancellationForm.map((x, i) => <p key={i}>{x}</p>)}</div>
      </Page>
    </>
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
