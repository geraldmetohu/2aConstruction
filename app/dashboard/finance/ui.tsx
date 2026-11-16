// Small presentational pieces shared by the finance pages (server) and forms (client).
import type { ReactNode } from "react";

export const gbp = (x: number | null | undefined, opts: { pence?: boolean } = {}) =>
  x == null ? "—" : `${x < 0 ? "−" : ""}£${Math.abs(x).toLocaleString("en-GB", { minimumFractionDigits: opts.pence === false ? 0 : 2, maximumFractionDigits: opts.pence === false ? 0 : 2 })}`;
export const ukDay = (d: string | null | undefined) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
export const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });

export const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base sm:text-sm";
export const btn = "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40";

export function Card({ title, right, children, className = "" }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 ${className}`}>
      {(title || right) && <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">{title && <h2 className="text-base font-bold text-neutral-900">{title}</h2>}{right && <div className="text-xs text-neutral-500">{right}</div>}</div>}
      {children}
    </section>
  );
}
export function Stat({ label, value, sub, tone = "plain" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "plain" | "good" | "bad" | "warn" | "dark" }) {
  const t = { plain: "bg-white", good: "bg-emerald-50", bad: "bg-red-50", warn: "bg-amber-50", dark: "bg-neutral-900 text-white" }[tone];
  return (
    <div className={`rounded-2xl border border-neutral-200 p-4 ${t}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${tone === "dark" ? "text-amber-400" : "text-neutral-500"}`}>{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums sm:text-2xl">{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${tone === "dark" ? "text-white/70" : "text-neutral-500"}`}>{sub}</p>}
    </div>
  );
}
export function Badge({ tone = "grey", children }: { tone?: "grey" | "green" | "red" | "amber" | "blue"; children: ReactNode }) {
  const t = { grey: "bg-neutral-100 text-neutral-700", green: "bg-emerald-100 text-emerald-800", red: "bg-red-100 text-red-800", amber: "bg-amber-100 text-amber-800", blue: "bg-sky-100 text-sky-800" }[tone];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${t}`}>{children}</span>;
}
/** A table that scrolls sideways on a phone instead of squashing. */
export function Table({ head, children, min = 640 }: { head: ReactNode[]; children: ReactNode; min?: number }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full text-sm" style={{ minWidth: min }}>
        <thead><tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-500">{head.map((h, i) => <th key={i} className={`py-2 pr-3 font-semibold ${i > 0 && typeof h === "string" && /£|amount|total|vat|paid|owed|profit|cost|box|days|balance|net|gross|cis/i.test(h) ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
    </div>
  );
}
export const Num = ({ children, strong, tone }: { children: ReactNode; strong?: boolean; tone?: "good" | "bad" }) =>
  <td className={`whitespace-nowrap py-2 pr-3 text-right tabular-nums ${strong ? "font-bold" : ""} ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : ""}`}>{children}</td>;

/** Money in vs out per month, as simple bars (no chart library). */
export function MonthBars({ months }: { months: { month: string; cashIn: number; cashOut: number; profit: number; expected: number }[] }) {
  const max = Math.max(1, ...months.flatMap(m => [m.cashIn, m.cashOut]));
  return (
    <div>
      <div className="flex h-44 items-end gap-1 sm:gap-2" role="img" aria-label="Money in and out per month">
        {months.map(m => (
          <div key={m.month} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-[2px]">
              <span className="w-1/2 max-w-[18px] rounded-t bg-emerald-500" style={{ height: `${(m.cashIn / max) * 100}%` }} />
              <span className="w-1/2 max-w-[18px] rounded-t bg-neutral-800" style={{ height: `${(m.cashOut / max) * 100}%` }} />
            </div>
            <span className="pointer-events-none absolute -top-14 left-1/2 z-10 hidden w-36 -translate-x-1/2 rounded-lg bg-neutral-900 px-2 py-1.5 text-[11px] text-white shadow group-hover:block">
              {monthName(m.month)}<br />In {gbp(m.cashIn, { pence: false })} · Out {gbp(m.cashOut, { pence: false })}<br />Profit {gbp(m.profit, { pence: false })}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 sm:gap-2">{months.map(m => <span key={m.month} className="flex-1 text-center text-[10px] text-neutral-500">{monthName(m.month).split(" ")[0]}</span>)}</div>
      <p className="mt-2 flex gap-4 text-xs text-neutral-600"><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />Money in</span><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-neutral-800" />Money out</span></p>
    </div>
  );
}
