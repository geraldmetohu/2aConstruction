import type { QuoteLayout } from "@/app/lib/takeoff/quote-format";

const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (q: number, unit: string) => `${Number(q.toFixed(2))} ${unit}`;

/** The scope of works and price in the client portal, in the format chosen for this client. */
export function PortalScope({ layout: L, net, vat, gross, discount, vatBreakdown, picked, onPick }: {
  layout: QuoteLayout; net: number; vat: number; gross: number;
  discount?: { label: string; amount: number; netBeforeDiscount: number }; vatBreakdown?: { percent: number; net: number; vat: number }[];
  /** Extras ticked by the client (by index) and the handler; omit when the quote can no longer change. */
  picked?: Record<number, boolean>; onPick?: (i: number, on: boolean) => void;
}) {
  const vb = vatBreakdown && vatBreakdown.length > 1 ? vatBreakdown : null;
  let n = 0;
  return (
    <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#071a33]">What we&apos;ll do &amp; the price</h2>
        <p className="text-xs text-neutral-500">{L.format === "ITEMISED" ? "Every item priced" : L.format === "NORMAL" ? "Each stage with what it includes" : "Each stage and its price"} · prices exclude VAT</p>
      </div>
      <div className="mt-5 space-y-6">
        {L.groups.map(g => (
          <div key={g.key}>
            <div className="flex items-baseline justify-between gap-3 rounded-xl bg-[#071a33] px-4 py-2.5 text-white">
              <p className="font-semibold">{g.title}</p><p className="font-semibold tabular-nums text-[#f5b400]">{gbp(g.net)}</p>
            </div>
            {g.text && <p className="mt-2 px-1 text-sm italic text-neutral-600">{g.text}</p>}
            <ol className="mt-2 divide-y divide-[#071a33]/10">
              {g.rows.map(r => (
                <li key={r.key} className="py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f5b400]/20 text-xs font-bold text-[#8a6500]">{++n}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3"><p className="font-semibold text-[#071a33]">{r.title}{r.provisional && <span className="ml-2 rounded bg-[#f5b400]/20 px-1.5 text-[10px] font-semibold text-[#8a6500]">provisional sum</span>}{r.vatPercent !== undefined && <span className="ml-2 rounded bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-800">{r.vatPercent}% VAT</span>}</p><p className="shrink-0 font-semibold tabular-nums text-[#071a33]">{gbp(r.net)}</p></div>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-700">{r.text}</p>
                      {r.items && r.items.length > 0 && (
                        <details className="group mt-2">
                          <summary className="cursor-pointer list-none text-xs font-semibold text-[#071a33]/70 hover:text-[#071a33] [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Show the {r.items.length} item{r.items.length > 1 ? "s" : ""} included ▾</span><span className="hidden group-open:inline">Hide items ▴</span></summary>
                          <table className="mt-2 w-full text-xs">
                            <tbody>{r.items.map(i => (
                              <tr key={i.id} className="border-b border-[#071a33]/5 align-top">
                                <td className="py-1 pr-2 text-neutral-700">{i.description}{i.byClient && <span className="ml-1 rounded bg-[#f5b400]/15 px-1.5 text-[10px] font-semibold text-[#8a6500]">you supply</span>}</td>
                                <td className="whitespace-nowrap py-1 text-right text-neutral-500">{qty(i.quantity, i.unit)}</td>
                                {L.format === "ITEMISED" && <td className="whitespace-nowrap py-1 pl-3 text-right font-medium tabular-nums text-[#071a33]">{i.byClient ? "—" : gbp(i.net ?? 0)}</td>}
                              </tr>
                            ))}</tbody>
                          </table>
                        </details>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <dl className="mt-6 space-y-1 border-t-2 border-[#071a33] pt-3 text-sm">
        {discount && <><div className="flex justify-between text-neutral-600"><dt>Subtotal</dt><dd className="tabular-nums">{gbp(discount.netBeforeDiscount)}</dd></div>
          <div className="flex justify-between text-emerald-700"><dt>{discount.label}</dt><dd className="tabular-nums">−{gbp(discount.amount)}</dd></div></>}
        <div className="flex justify-between"><dt>Total (ex VAT)</dt><dd className="font-semibold tabular-nums">{gbp(net)}</dd></div>
        {vb ? vb.map(v => <div key={v.percent} className="flex justify-between text-neutral-600"><dt>VAT at {v.percent}% on {gbp(v.net)}</dt><dd className="tabular-nums">{gbp(v.vat)}</dd></div>)
          : <div className="flex justify-between text-neutral-600"><dt>VAT</dt><dd className="tabular-nums">{gbp(vat)}</dd></div>}
        <div className="flex justify-between text-lg font-semibold text-[#071a33]"><dt>Total including VAT</dt><dd className="tabular-nums">{gbp(gross)}</dd></div>
      </dl>
      {L.options.length > 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-[#071a33]/20 p-4">
          <p className="font-semibold text-[#071a33]">Optional extras <span className="font-normal text-neutral-500">{onPick ? "– tick any you'd like, then press “See new price”" : "– ask us to add any of these"}</span></p>
          <ul className="mt-2 space-y-1.5 text-sm">{L.options.map((o, i) => {
            const on = picked ? !!picked[i] : !!o.chosen;
            return (
              <li key={i}><label className={`flex items-center justify-between gap-3 ${onPick && o.price != null ? "cursor-pointer" : ""}`}>
                <span className="flex items-center gap-2">{onPick && o.price != null && <input type="checkbox" className="h-4 w-4 accent-[#f5b400]" checked={on} onChange={e => onPick(i, e.target.checked)} />}{o.title}{!onPick && o.chosen && <span className="rounded bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-800">added</span>}</span>
                <span className="tabular-nums text-neutral-700">{o.price != null ? `${gbp(o.price)} + VAT` : "Price on request"}</span>
              </label></li>
            );
          })}</ul>
        </div>
      )}
      {L.notes && <div className="mt-4 rounded-xl bg-[#f5b400]/10 p-4 text-sm text-[#071a33]"><p className="font-semibold">Notes</p><p className="mt-1 whitespace-pre-line">{L.notes}</p></div>}
    </section>
  );
}
