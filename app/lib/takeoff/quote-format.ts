// How the price is set out for the client. Three formats share one structure:
//   SIMPLE   – each step (activity) with what is done and its price
//   NORMAL   – the same, plus what each step includes (quantities, no prices)
//   ITEMISED – every product and job in each step with its price
// Selling prices per line are the cost line with the job's waste, contingency and markup applied,
// so the rows always add up to the quotation total.

import type { TakeoffInput, Wording } from "./schema";
import type { CostKind, TakeoffLine, TakeoffResult, Trade } from "./types";
import { fmt, money } from "./util";

export type QuoteFormat = "SIMPLE" | "NORMAL" | "ITEMISED";
export type QuoteGroupBy = "AREA" | "TRADE";

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  /** Selling price for this item (itemised quotes only). */
  net?: number;
  /** Selling price per unit (itemised quotes only). */
  rate?: number;
  /** The client buys this item. */
  byClient?: boolean;
  kind: "MATERIAL" | "LABOUR" | "OTHER";
}

export interface QuoteRow {
  /** Key for wording edits: "<area>::<stage>" or "trade:<TRADE>::<area>". */
  key: string;
  title: string;
  text: string;
  net: number;
  days: number;
  /** Main trade (most of the value) – for our own screens only, never printed for the client. */
  trade?: string;
  /** Every trade working in this step, largest share first – for our own screens only. */
  trades?: string[];
  items?: QuoteItem[];
  /** VAT rate for this step when it differs from the quote's (e.g. 0% energy-saving materials). */
  vatPercent?: number;
  /** A provisional sum, adjusted to the actual cost. */
  provisional?: boolean;
}

export interface QuoteGroup { key: string; title: string; text?: string; net: number; rows: QuoteRow[] }

export interface QuoteLayout {
  format: QuoteFormat;
  groupBy: QuoteGroupBy;
  intro: string;
  groups: QuoteGroup[];
  options: { title: string; price: number | null; chosen?: boolean }[];
  notes: string;
}

const SITE_TITLE = "Site set-up & preliminaries";
const stageTitle = (stage: string) => stage.includes(" · ") ? stage.split(" · ").slice(1).join(" · ") : stage;
const sentence = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const PLURAL: Record<string, string> = { delivery: "deliveries", box: "boxes", day: "days", pair: "pairs", each: "" };
/** Unit for a quantity, as a person would write it: 1 bag / 6 bags, 2 m², 12 (no "each"). */
export const unitText = (u: string, q = 2) => {
  const m = u.replace(/^m2$/, "m²").replace(/^m3$/, "m³");
  if (m === "each") return "";
  if (/^(m|m²|m³|kg|t|l|m²·week)$/i.test(m) || q === 1 || /s$/.test(m) || m.includes(" ")) return m;
  return PLURAL[m] ?? `${m}s`;
};
const qtyText = (q: number, u: string) => `${fmt(q)}${unitText(u, q) ? ` ${unitText(u, q)}` : ""}`;
const kindOf = (k: CostKind): QuoteItem["kind"] => k === "LABOUR" ? "LABOUR" : k === "MATERIAL" || k === "SUPPORTING" ? "MATERIAL" : "OTHER";

/** Selling price of each line: cost × (1 + waste for materials) × (1 + contingency) × (1 + markup). */
export function sellingPrices(result: TakeoffResult, input?: Pick<TakeoffInput, "commercial">) {
  const direct = result.lines.reduce((s, l) => s + l.total, 0);
  const c = input?.commercial;
  const sell = new Map<TakeoffLine, number>();
  if (c) {
    const cm = (1 + c.contingencyPercent / 100) * (1 + c.markupPercent / 100), w = 1 + c.wastePercent / 100;
    for (const l of result.lines) sell.set(l, l.total * (l.kind === "MATERIAL" || l.kind === "SUPPORTING" ? w : 1) * cm);
  } else {
    const f = direct > 0 ? (result.totals.netBeforeDiscount ?? result.totals.net) / direct : 0;
    for (const l of result.lines) sell.set(l, l.total * f);
  }
  return sell;
}

/** Fallback description of a row: the jobs in it with quantities (or the items when it has no labour). */
function describeLines(ls: TakeoffLine[]) {
  const labour = ls.filter(l => l.kind === "LABOUR" && !l.excluded);
  const pick = labour.length ? labour : ls.filter(l => !l.excluded);
  const seen = new Map<string, { q: number; unit: string }>();
  for (const l of pick) {
    const d = l.description.replace(/\s+–\s+.*$/, "");
    const cur = seen.get(d);
    seen.set(d, { q: (cur?.q ?? 0) + l.quantity, unit: l.unit });
  }
  const bits = [...seen.entries()].map(([d, { q, unit }]) => ["item", "job"].includes(unit) && q === 1 ? d : `${d} (${qtyText(q, unit)})`);
  return bits.length ? `${sentence(bits.join("; "))}.` : "";
}

/** Items in a row: identical products / jobs merged, client-supplied kept (no price). */
function itemsOf(ls: TakeoffLine[], sell: Map<TakeoffLine, number>, wording: Wording) {
  const map = new Map<string, QuoteItem & { raw: number }>();
  for (const l of ls) {
    if (l.excluded) continue;
    const k = `${l.rateKey}|${l.description}|${l.unit}|${l.clientSupplied ? 1 : 0}`;
    const cur = map.get(k);
    if (cur) { cur.quantity = Math.round((cur.quantity + l.quantity) * 100) / 100; cur.raw += sell.get(l) ?? 0; continue; }
    map.set(k, { id: l.lineId, description: wording.lines[l.lineId] || l.description, quantity: l.quantity, unit: l.unit, byClient: l.clientSupplied || undefined, kind: kindOf(l.kind), raw: sell.get(l) ?? 0 });
  }
  return [...map.values()].map(({ raw, ...it }) => ({ ...it, unit: unitText(it.unit, it.quantity), net: money(raw), rate: it.quantity > 0 ? money(raw / it.quantity) : 0 }));
}

/**
 * Build the scope table. Groups are rooms / projects (AREA) or trades (TRADE); site set-up comes first.
 * Wording edits (titles, descriptions, hidden rows) are applied here. Hidden rows fold into the
 * first visible row of the same group, so nothing drops out of the price.
 */
export function buildQuoteLayout(result: TakeoffResult, input: TakeoffInput | undefined, trades: Partial<Record<Trade, { name: string }>> = {}): QuoteLayout {
  const terms = input?.terms;
  const format: QuoteFormat = terms?.format ?? "SIMPLE", groupBy: QuoteGroupBy = terms?.groupBy ?? "AREA";
  const wording: Wording = input?.wording ?? { intro: "", rows: {}, lines: {}, options: [], notes: "" };
  const sell = sellingPrices(result, input);
  const live = result.lines.filter(l => !l.excluded && (l.total > 0 || l.clientSupplied));

  type Raw = { key: string; group: string; groupTitle: string; title: string; lines: TakeoffLine[]; scope: string[]; days: number; trade?: string; trades?: string[] };
  const raws: Raw[] = [];
  const at = new Map<string, Raw>();
  const add = (key: string, group: string, groupTitle: string, title: string, l: TakeoffLine, trade?: string) => {
    let r = at.get(key);
    if (!r) { r = { key, group, groupTitle, title, lines: [], scope: [], days: 0, trade }; at.set(key, r); raws.push(r); }
    r.lines.push(l);
  };
  for (const l of live) {
    const site = l.phase === "SITE";
    if (groupBy === "TRADE" && !site) {
      const t = l.trade ?? "GENERAL_BUILDER";
      add(`trade:${t}::${l.area}`, `trade:${t}`, trades[t]?.name ?? t, l.area, l, trades[t]?.name);
    } else add(`${l.area}::${l.stage}`, site ? "site" : l.area, site ? SITE_TITLE : l.area, stageTitle(l.stage), l, l.trade ? trades[l.trade]?.name : undefined);
  }

  // Scope sentences: a room's single sentence describes the whole room (group text); otherwise each sentence belongs to its stage.
  const groupText = new Map<string, string[]>();
  if (groupBy === "AREA") {
    const byArea = new Map<string, typeof result.scopeItems>();
    for (const s of result.scopeItems) byArea.set(s.area, [...(byArea.get(s.area) ?? []), s]);
    for (const [area, items] of byArea) {
      const rows = raws.filter(r => r.lines[0]?.area === area);
      const isSite = rows.some(r => r.group === "site");
      // Hand-priced jobs always describe their own row.
      const own = items.filter(s => !s.stage.startsWith("Extra · ")), work = rows.filter(r => !r.lines[0].stage.startsWith("Extra · "));
      let rest = items;
      if (!isSite && own.length === 1 && work.length > 1) { groupText.set(area, [own[0].text]); rest = items.filter(s => s !== own[0]); }
      // Each sentence belongs to the step priced just before it was written; summaries of several steps introduce the group.
      for (const s of rest) {
        const r = s.summary && !isSite ? undefined : at.get(`${s.area}::${s.stage}`) ?? (isSite ? rows[rows.length - 1] : undefined);
        if (r) r.scope.push(s.text); else groupText.set(area, [...(groupText.get(area) ?? []), s.text]);
      }
    }
  }
  // Days on site for a row: trades work side by side, the same trade in sequence. Trade shown = the one with most of the value.
  for (const r of raws) {
    if (groupBy === "AREA") {
      const val = new Map<string, number>();
      for (const l of r.lines) if (l.trade) val.set(l.trade, (val.get(l.trade) ?? 0) + (sell.get(l) ?? 0));
      const ranked = [...val.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t as Trade);
      r.trade = ranked[0] ? trades[ranked[0]]?.name : undefined;
      r.trades = ranked.map(t => trades[t]?.name ?? t);
    }
    const by = new Map<string, number>();
    for (const l of r.lines) if (l.days && l.gang?.length) by.set(l.gang[0].trade, (by.get(l.gang[0].trade) ?? 0) + l.days);
    r.days = Math.ceil(Math.max(0, ...by.values()) * 2 - 1e-9) / 2;
  }

  // Groups in order: site first, then the order work appears.
  const order: string[] = [];
  for (const r of raws) if (!order.includes(r.group)) order.push(r.group);
  order.sort((a, b) => (a === "site" ? -1 : b === "site" ? 1 : 0));

  const groups: QuoteGroup[] = order.map(g => {
    const rs = raws.filter(r => r.group === g);
    const built = rs.map(r => {
      const w = wording.rows[r.key];
      const items = itemsOf(r.lines, sell, wording);
      const includes = r.group === "site" && r.scope.length ? ` Includes: ${[...new Set(r.lines.map(l => l.description.replace(/\s+\(.*\)$/, "")))].join("; ")}.` : "";
      const custom = r.lines[0].customId ? input?.customItems.find(c => c.id === r.lines[0].customId) : undefined;
      const option = r.lines[0].customId?.startsWith("option:") ? "Optional extra you chose – added to the price." : "";
      const text = w?.text || option || (custom ? custom.description || `${custom.title}.` : r.scope.length ? r.scope.join(" ") + includes : describeLines(r.lines));
      const row: QuoteRow = { key: r.key, title: w?.title || r.title, text, net: money(items.reduce((s, i) => s + (i.net ?? 0), 0)), days: r.days, trade: r.trade, trades: r.trades, items };
      const std = input?.commercial.vatPercent ?? 20, rates = new Set(r.lines.map(l => l.vatPercent ?? std));
      if (rates.size === 1 && !rates.has(std)) row.vatPercent = [...rates][0];
      if (r.lines.every(l => l.provisional)) row.provisional = true;
      return { row, hidden: w?.hidden === true };
    });
    // Fold hidden rows into the first visible one.
    const visible = built.filter(b => !b.hidden).map(b => b.row);
    const rows = visible.length ? visible : built.map(b => b.row);
    if (visible.length) for (const b of built) if (b.hidden) {
      const host = visible[0];
      host.net = money(host.net + b.row.net); host.items = [...(host.items ?? []), ...(b.row.items ?? [])]; host.days = Math.round((host.days + b.row.days) * 10) / 10;
    }
    const title = rs[0].groupTitle;
    return { key: g, title, text: groupText.get(g)?.join(" "), net: money(rows.reduce((s, r) => s + r.net, 0)), rows };
  });

  // Pennies from rounding go on the largest row so the table adds up to the quotation total.
  const all = groups.flatMap(g => g.rows);
  const drift = money((result.totals.netBeforeDiscount ?? result.totals.net) - all.reduce((s, r) => s + r.net, 0));
  if (all.length && drift) {
    const big = all.reduce((a, b) => (b.net > a.net ? b : a));
    big.net = money(big.net + drift);
    const g = groups.find(x => x.rows.includes(big))!;
    g.net = money(g.net + drift);
    const it = big.items?.reduce((a, b) => ((b.net ?? 0) > (a.net ?? 0) ? b : a));
    if (it) { it.net = money((it.net ?? 0) + drift); it.rate = it.quantity > 0 ? money((it.net ?? 0) / it.quantity) : it.rate; }
  }

  // What the client sees depends on the format.
  for (const r of all) {
    if (format === "SIMPLE") delete r.items;
    else if (format === "NORMAL") r.items = r.items?.map(({ net: _n, rate: _r, ...i }) => i);
  }
  return { format, groupBy, intro: wording.intro, groups, options: wording.options, notes: wording.notes };
}
