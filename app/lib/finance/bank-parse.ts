// Reads bank statements – PDF text (from pdf.js in the browser) or CSV exports – for Barclays, Lloyds, HSBC and
// NatWest (and most other UK banks), and suggests what each line is. Pure functions, no database.

import { r2, type Day } from "./rules";

export interface BankTxn { date: Day; description: string; amount: number; balance: number | null }
export interface ParsedStatement {
  bank: string; periodFrom: Day | null; periodTo: Day | null; openingBalance: number | null; closingBalance: number | null;
  txns: BankTxn[]; warnings: string[];
}
/** A piece of text on a PDF page: x/y from the bottom-left (pdf.js transform), w = width. */
export interface PdfItem { str: string; x: number; y: number; w: number }

// ---------------------------------------------------------------- Dates & amounts

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const p2 = (n: number) => String(n).padStart(2, "0");
const mk = (y: number, m: number, d: number): Day | null => {
  if (y < 100) y += 2000;
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? `${y}-${p2(m)}-${p2(d)}` : null;
};
/** A date at the start of `s`: "12 Mar 2026", "12 Mar 26", "12Mar26", "12 March", "12/03/2026", "2026-03-12". Returns the date and the rest. */
export function leadingDate(s: string, yearHint: number | null): { date: Day; rest: string; hadYear: boolean } | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})\b\s*([\s\S]*)$/);
  if (m) { const d = mk(+m[1], +m[2], +m[3]); return d ? { date: d, rest: m[4], hadYear: true } : null; }
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b\s*([\s\S]*)$/);
  if (m) { const d = mk(+m[3], +m[2], +m[1]); return d ? { date: d, rest: m[4], hadYear: true } : null; }
  m = t.match(/^(\d{1,2})\s?([A-Za-z]{3,9})\.?(?:\s?(\d{4}|\d{2})(?![\d.,]))?\b\s*([\s\S]*)$/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (!mon || (m[2].length > 3 && !/^(january|february|march|april|may|june|july|august|september|sept|october|november|december)$/i.test(m[2]))) return null;
    const hadYear = !!m[3], y = hadYear ? +m[3] : yearHint;
    if (y == null) return null;
    const d = mk(y, mon, +m[1]);
    return d ? { date: d, rest: m[4], hadYear } : null;
  }
  return null;
}
const AMOUNT = /^[-−]?£?\d{1,3}(?:,\d{3})*(?:\.\d{2})(?:\s?(?:CR|DR|[-+]))?$|^[-−]?£?\d+\.\d{2}(?:\s?(?:CR|DR|[-+]))?$/i;
export const isAmount = (s: string) => AMOUNT.test(s.trim());
/** "1,234.56" → 1234.56; "12.00DR" / "-12.00" / "12.00-" → −12; "5.00CR" → 5. */
export function amountOf(s: string): number {
  const t = s.trim().replace(/£/g, "").replace(/−/g, "-");
  const neg = /^-/.test(t) || /(DR|-)$/i.test(t);
  const n = Number(t.replace(/[^\d.]/g, ""));
  return r2(neg ? -n : n);
}

// ---------------------------------------------------------------- Which bank

export function detectBank(text: string) {
  const t = text.toLowerCase();
  if (t.includes("barclays")) return "Barclays";
  if (t.includes("lloyds")) return "Lloyds";
  if (t.includes("hsbc")) return "HSBC";
  if (t.includes("natwest") || t.includes("national westminster")) return "NatWest";
  if (t.includes("royal bank of scotland") || t.includes("rbs")) return "RBS";
  if (t.includes("halifax")) return "Halifax";
  if (t.includes("santander")) return "Santander";
  if (t.includes("metro bank")) return "Metro Bank";
  if (t.includes("starling")) return "Starling";
  if (t.includes("monzo")) return "Monzo";
  if (t.includes("tide")) return "Tide";
  return "Bank";
}

/** Payment-type codes that start a new transaction on UK statements. */
const TYPE_START = /^(DD|SO|BP|BGC|CR|DR|TFR|FPI|FPO|DEB|CHG|CHQ|ATM|CPT|VIS|VISA|POS|PAY|INT|COM|SBT|D\/D|S\/O|\)\)\)|Card Payment|Card Transaction|Contactless|Direct Debit|Standing Order|Bill Payment|Received From|Online Transaction|OnLine Transaction|Automated Credit|Faster Payment|Transfer|Cash Withdrawal|Counter Credit|Interest|Commission|Charges?)\b/i;
const OPENING = /(balance brought forward|brought forward|opening balance|start balance|previous balance|balance from previous)/i;
const CLOSING = /(balance carried forward|carried forward|closing balance|end balance|balance to next)/i;

// ---------------------------------------------------------------- PDF

interface Line { items: PdfItem[]; text: string }
function toLines(items: PdfItem[]): Line[] {
  const sorted = items.filter(i => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfItem[][] = [];
  for (const it of sorted) {
    const l = lines[lines.length - 1];
    if (l && Math.abs(l[0].y - it.y) <= 2.5) l.push(it); else lines.push([it]);
  }
  return lines.map(l => { const s = l.sort((a, b) => a.x - b.x); return { items: s, text: s.map(i => i.str.trim()).join(" ").replace(/\s+/g, " ") }; });
}

type Col = "OUT" | "IN" | "BAL";
const HEADERS: [Col, RegExp][] = [
  ["OUT", /^(paid out|money out|payments?|withdrawals?|withdrawn|debits?|out|amount out|paid out £|payments out|money out \(£\))$/i],
  ["IN", /^(paid in|money in|deposits?|credits?|receipts|in|amount in|paid in £|payments in|money in \(£\))$/i],
  ["BAL", /^(balance|balance £|balance \(£\))$/i],
];
/** Find the column headers on a line (words may be split across pieces of text, e.g. "Paid" + "out"). Uses right edges. */
function headerCols(l: Line): Partial<Record<Col, number>> | null {
  const cols: Partial<Record<Col, number>> = {};
  const it = l.items;
  for (let i = 0; i < it.length; i++) {
    for (const span of [1, 2, 3]) {
      if (i + span > it.length) continue;
      const words = it.slice(i, i + span).map(x => x.str.trim()).join(" ").replace(/\(?(£|gbp)\)?/gi, "").replace(/\s+/g, " ").trim();
      for (const [c, re] of HEADERS) if (!(c in cols) && re.test(words)) cols[c] = it[i + span - 1].x + it[i + span - 1].w;
    }
  }
  return "BAL" in cols && ("OUT" in cols || "IN" in cols) ? cols : null;
}

/** Read transactions from the text of a statement PDF (one array of items per page). */
export function parsePdfText(pages: PdfItem[][]): ParsedStatement {
  const all = pages.flat(), fullText = all.map(i => i.str).join(" ");
  const warnings: string[] = [];
  const years = [...fullText.matchAll(/\b(20\d{2})\b/g)].map(m => +m[1]);
  let year: number | null = years.length ? Math.min(...years) : new Date().getUTCFullYear();
  let cols: Partial<Record<Col, number>> | null = null;
  let opening: number | null = null, closing: number | null = null;
  const txns: BankTxn[] = [];
  let lastDate: Day | null = null, lastMonth = 0;
  type Cur = { date: Day | null; texts: string[]; amounts: { v: number; right: number; raw: string }[] | null };
  let cur: Cur | null = null;

  const flush = () => {
    if (!cur?.amounts || !cur.date) { cur = null; return; }
    const desc = cur.texts.join(" ").replace(/\s+/g, " ").trim();
    let amount: number | null = null, balance: number | null = null;
    if (cols) {
      for (const a of cur.amounts) {
        const near = (Object.entries(cols) as [Col, number][]).sort((x, y) => Math.abs(x[1] - a.right) - Math.abs(y[1] - a.right))[0][0];
        if (near === "BAL") balance = a.v; else if (near === "OUT") amount = -Math.abs(a.v); else amount = Math.abs(a.v);
      }
    } else if (cur.amounts.length >= 2) { amount = cur.amounts[0].v; balance = cur.amounts[cur.amounts.length - 1].v; }
    else amount = cur.amounts[0].v;
    if (amount === null && balance !== null && txns.length && txns[txns.length - 1].balance !== null) amount = r2(balance - txns[txns.length - 1].balance!);
    if (amount !== null && amount !== 0) {
      // Direction check from the running balance (fixes columns the header guess got wrong).
      const prev = txns.length ? txns[txns.length - 1].balance : opening;
      if (balance !== null && prev !== null && Math.abs(r2(prev - amount) - balance) < 0.005 && Math.abs(r2(prev + amount) - balance) >= 0.005) amount = -amount;
      txns.push({ date: cur.date, description: desc.slice(0, 300), amount: r2(amount), balance });
    }
    cur = null;
  };

  for (const page of pages) {
    for (const l of toLines(page)) {
      const hc = headerCols(l);
      if (hc) { flush(); cols = hc; continue; }
      if (/^(page \d+|continued|statement|sort code|account (number|no)|iban|bic|date description|date payment type)/i.test(l.text) && !l.items.some(i => isAmount(i.str))) continue;
      const amounts = l.items.filter(i => isAmount(i.str)).map(i => ({ v: amountOf(i.str), right: i.x + i.w, raw: i.str }));
      const textItems = l.items.filter(i => !isAmount(i.str));
      let text = textItems.map(i => i.str.trim()).join(" ").replace(/\s+/g, " ").trim();
      if (OPENING.test(text)) { flush(); if (amounts.length) opening = amounts[amounts.length - 1].v; continue; }
      if (CLOSING.test(text)) { flush(); if (amounts.length) closing = amounts[amounts.length - 1].v; continue; }
      const ld = leadingDate(text, year);
      let date: Day | null = null;
      if (ld) {
        date = ld.date; text = ld.rest.trim();
        const mo = +date.slice(5, 7);
        if (!ld.hadYear && lastMonth === 12 && mo === 1) { year = (year ?? +date.slice(0, 4)) + 1; date = `${year}${date.slice(4)}`; }
        if (ld.hadYear) year = +date.slice(0, 4);
        lastMonth = mo; lastDate = date;
      }
      if (!cols && !cur && !amounts.length && !date) continue; // before the transactions start
      const startsNew = !!date || TYPE_START.test(text);
      if (!cur || startsNew || (cur.amounts && amounts.length)) { flush(); cur = { date: date ?? lastDate, texts: [], amounts: null }; }
      if (text) cur.texts.push(text);
      if (amounts.length) cur.amounts = amounts;
    }
  }
  flush();

  if (!txns.length) warnings.push("No transactions found. If this is a scanned statement, download the PDF or CSV again from online banking.");
  let mismatches = 0;
  for (let i = 1; i < txns.length; i++) {
    const a = txns[i - 1].balance, b = txns[i].balance;
    if (a !== null && b !== null && Math.abs(r2(a + txns[i].amount) - b) >= 0.01) mismatches++;
  }
  if (mismatches) warnings.push(`${mismatches} line${mismatches === 1 ? "" : "s"} don't follow the running balance – please check them.`);
  const dates = txns.map(t => t.date).sort();
  if (opening === null && txns[0]?.balance != null) opening = r2(txns[0].balance! - txns[0].amount);
  if (closing === null && txns.length && txns[txns.length - 1].balance != null) closing = txns[txns.length - 1].balance;
  if (opening !== null && closing !== null && txns.length) {
    const diff = r2(opening + txns.reduce((s, t) => s + t.amount, 0) - closing);
    if (Math.abs(diff) >= 0.01) warnings.push(`Opening balance + transactions is £${diff.toFixed(2)} away from the closing balance – a line may be missing or misread.`);
  }
  return { bank: detectBank(fullText), periodFrom: dates[0] ?? null, periodTo: dates[dates.length - 1] ?? null, openingBalance: opening, closingBalance: closing, txns, warnings };
}

// ---------------------------------------------------------------- CSV

export function csvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c));
}

/** Read a CSV export (Barclays, Lloyds, HSBC, NatWest and most others). */
export function parseCsv(text: string): ParsedStatement {
  const rows = csvRows(text), warnings: string[] = [];
  if (!rows.length) return { bank: "Bank", periodFrom: null, periodTo: null, openingBalance: null, closingBalance: null, txns: [], warnings: ["The file is empty."] };
  const hi = rows.findIndex(r => r.some(c => /date/i.test(c)) && r.some(c => /(amount|value|debit|credit|paid|money|withdraw|deposit)/i.test(c)));
  let idx: { date: number; desc: number[]; amount: number; out: number; in: number; bal: number };
  let body: string[][];
  if (hi >= 0) {
    const h = rows[hi].map(c => c.toLowerCase());
    const find = (re: RegExp) => h.findIndex(c => re.test(c));
    idx = {
      date: find(/^(transaction date|date|posting date|value date)$/) >= 0 ? find(/^(transaction date|date|posting date|value date)$/) : find(/date/),
      desc: [find(/^(type|transaction type|subcategory)$/), find(/(description|memo|details|narrative|payee|reference|counter party)/)].filter(i => i >= 0),
      amount: find(/^(amount|value|amount \(gbp\)|amount gbp)$/),
      out: find(/(debit|paid out|money out|withdraw)/), in: find(/(credit|paid in|money in|deposit)/), bal: find(/balance/),
    };
    body = rows.slice(hi + 1);
  } else {
    // No header (HSBC): date, description, amount[, balance]
    idx = { date: 0, desc: [1], amount: 2, out: -1, in: -1, bal: rows[0].length > 3 ? 3 : -1 };
    body = rows;
  }
  const txns: BankTxn[] = [];
  for (const r of body) {
    const ld = leadingDate(r[idx.date] ?? "", null);
    if (!ld) continue;
    const num = (i: number) => (i >= 0 && r[i] && /\d/.test(r[i]) ? amountOf(r[i].replace(/\s/g, "")) : 0);
    let amount = idx.amount >= 0 ? num(idx.amount) : r2(num(idx.in) - Math.abs(num(idx.out)));
    if (idx.amount < 0 && idx.in < 0 && idx.out >= 0) amount = -Math.abs(num(idx.out));
    if (!amount) continue;
    const description = idx.desc.map(i => r[i] ?? "").filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 300);
    txns.push({ date: ld.date, description, amount, balance: idx.bal >= 0 && r[idx.bal] && /\d/.test(r[idx.bal]) ? amountOf(r[idx.bal]) : null });
  }
  // Most banks export newest first – store oldest first.
  if (txns.length > 1 && txns[0].date > txns[txns.length - 1].date) txns.reverse();
  if (!txns.length) warnings.push("No transactions found – is this the CSV export from online banking?");
  const dates = txns.map(t => t.date).sort();
  return {
    bank: detectBank(text), periodFrom: dates[0] ?? null, periodTo: dates[dates.length - 1] ?? null,
    openingBalance: txns[0]?.balance != null ? r2(txns[0].balance! - txns[0].amount) : null,
    closingBalance: txns.length && txns[txns.length - 1].balance != null ? txns[txns.length - 1].balance : null, txns, warnings,
  };
}

// ---------------------------------------------------------------- Duplicates

export const normDesc = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
/** A key that is the same when the same line is imported twice (e.g. overlapping statements). */
export function fingerprints(txns: BankTxn[]): string[] {
  const seen = new Map<string, number>();
  return txns.map(t => {
    const base = `${t.date}|${t.amount.toFixed(2)}|${normDesc(t.description).slice(0, 60)}|${t.balance ?? ""}`;
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    return `${base}#${n}`;
  });
}

// ---------------------------------------------------------------- Suggestions

export interface Suggestion {
  kind: "MATCH" | "RULE" | "CLIENT_PAYMENT" | "INVOICE" | "JOB" | "RECURRING" | "WORKER" | "SUPPLIER" | "TRANSFER";
  label: string; categoryKey: string; quoteId?: string | null; workerId?: string | null; recurringId?: string | null; paymentId?: string | null;
  /** MATCH: already recorded – just tick it off against the bank. */
  entryId?: string | null; expenseId?: string | null;
  confidence: number;
}
export interface SuggestContext {
  rules: { pattern: string; dir: "IN" | "OUT"; categoryKey: string; quoteId: string | null; workerId: string | null; counterparty: string }[];
  reportedPayments: { id: string; quoteId: string; amount: number; paidOn: Day; reference: string; label: string }[];
  invoices: { quoteId: string; number: string; gross: number; dueOn: Day; label: string }[];
  jobs: { quoteId: string; reference: string; clientName: string; label: string }[];
  recurring: { id: string; name: string; supplier: string; amount: number; categoryKey: string }[];
  workers: { id: string; name: string; categoryKey: string }[];
  /** Recorded by hand but not yet seen in the bank: amount as it hits the bank (+ in, − out, after CIS). */
  recorded?: { kind: "ENTRY" | "EXPENSE" | "PAYMENT"; id: string; date: Day; amount: number; label: string; categoryKey: string; quoteId: string | null }[];
}
const SUPPLIERS: [RegExp, string, string][] = [
  [/\b(SCREWFIX|TOOLSTATION|SELCO|WICKES|B ?& ?Q|BANDQ|B AND Q|TRAVIS PERKINS|JEWSON|BUILDBASE|HOWDENS|CEF|CITY PLUMBING|PLUMBASE|MKM|BUILDERS DEPOT|BUILDER DEPOT|TOPPS TILES|MANDARIN STONE|HOMEBASE|IRONMONGERY DIRECT|TIMBER|BUILDERS MERCHANT|NATIONAL TIMBER|ROOFING SUPERSTORE|ENCON|CCF|SIG )/, "MATERIALS", "Builders' merchant"],
  [/\b(HSS|SPEEDY|BRANDON HIRE|GAP HIRE|HIRE STATION|A PLANT|SUNBELT|NATIONWIDE PLATFORMS)\b/, "PLANT", "Plant & tool hire"],
  [/\b(SKIP|WASTE|GRAB HIRE|MURPHY|ENVIRONMENTAL)\b/, "SKIPS", "Skips & waste"],
  [/\b(SHELL|ESSO|TEXACO|JET |GULF|MFG|BP |PETROL|FUEL|DVLA|KWIK FIT|HALFORDS|NATIONAL TYRES|ULEZ|TFL|PARKING|RINGGO|PAYBYPHONE|DART CHARGE|CONGESTION)/, "VEHICLE_RUNNING", "Van running"],
  [/\b(CHECKATRADE|RATED PEOPLE|MYBUILDER|TRUSTMARK|FMB|FEDERATION OF MASTER|BARK\.COM|TRUSTATRADER|HOUZZ)\b/, "MEMBERSHIPS", "Memberships & leads"],
  [/\b(INSURANCE|HISCOX|AXA|AVIVA|ZURICH|SIMPLY BUSINESS|ALLIANZ|QDOS|TRADEDIRECT|TRADESMAN SAVER|ADMIRAL|DIRECT LINE|COVEA)\b/, "INSURANCE", "Insurance"],
  [/\b(GOOGLE|MICROSOFT|ADOBE|XERO|QUICKBOOKS|INTUIT|SAGE|FREEAGENT|VERCEL|GITHUB|DROPBOX|APPLE\.COM|ZOOM|CANVA|WIX|GODADDY|123 ?REG|UPLOADTHING|RESEND|OPENAI|ANTHROPIC)\b/, "SOFTWARE", "Software & subscriptions"],
  [/\b(EE |EE LIMITED|O2|VODAFONE|BT GROUP|BT\b|SKY|THREE|VIRGIN MEDIA|GIFFGAFF|PLUSNET|TALKTALK)/, "PHONE_INTERNET", "Phone & internet"],
  [/\b(ACCOUNTANT|ACCOUNTANCY|SOLICITOR|COMPANIES HOUSE)\b/, "PROFESSIONAL", "Professional fees"],
  [/\b(CSCS|CITB|NVQ|TRAINING)\b/, "TRAINING", "Training"],
];
const words = (s: string) => normDesc(s).split(" ").filter(w => w.length >= 3);

/** Best guesses for a bank line, most likely first. */
export function suggest(line: { date: Day; description: string; amount: number }, ctx: SuggestContext): Suggestion[] {
  const d = normDesc(line.description), dir: "IN" | "OUT" = line.amount >= 0 ? "IN" : "OUT", abs = Math.abs(line.amount);
  const out: Suggestion[] = [];
  const near = (a: Day, b: Day, days: number) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= days * 86_400_000;
  for (const r of ctx.recorded ?? []) {
    if (Math.abs(r.amount - line.amount) < 0.01 && near(r.date, line.date, 10)) out.push({
      kind: "MATCH", label: `Already recorded: ${r.label}`, categoryKey: r.categoryKey, quoteId: r.quoteId,
      ...(r.kind === "ENTRY" ? { entryId: r.id } : r.kind === "EXPENSE" ? { expenseId: r.id } : { paymentId: r.id }), confidence: 0.98 - Math.abs(new Date(r.date).getTime() - new Date(line.date).getTime()) / 86_400_000 / 100,
    });
  }
  for (const r of ctx.rules) {
    const p = normDesc(r.pattern);
    if (p && r.dir === dir && d.includes(p)) out.push({ kind: "RULE", label: `Like before: ${r.counterparty || r.pattern}`, categoryKey: r.categoryKey, quoteId: r.quoteId, workerId: r.workerId, confidence: 0.95 });
  }
  if (dir === "IN") {
    for (const p of ctx.reportedPayments) if (Math.abs(p.amount - abs) < 0.01 && near(p.paidOn, line.date, 21)) out.push({ kind: "CLIENT_PAYMENT", label: `Client payment ${p.label} – confirm it`, categoryKey: "SALES", quoteId: p.quoteId, paymentId: p.id, confidence: 0.97 });
    for (const inv of ctx.invoices) if (Math.abs(inv.gross - abs) < 0.01) out.push({ kind: "INVOICE", label: `Invoice ${inv.number} – ${inv.label}`, categoryKey: "SALES", quoteId: inv.quoteId, confidence: 0.9 });
    for (const j of ctx.jobs) {
      const surname = normDesc(j.clientName).split(" ").filter(w => w.length >= 3).pop();
      if (d.includes(normDesc(j.reference)) || (surname && d.split(" ").includes(surname))) out.push({ kind: "JOB", label: `Payment for ${j.label}`, categoryKey: "SALES", quoteId: j.quoteId, confidence: d.includes(normDesc(j.reference)) ? 0.85 : 0.6 });
    }
    if (/\b(INTEREST|INT PAID|GROSS INTEREST)\b/.test(d)) out.push({ kind: "SUPPLIER", label: "Bank interest", categoryKey: "OTHER_INCOME", confidence: 0.8 });
    if (/\bHMRC\b/.test(d)) out.push({ kind: "SUPPLIER", label: "HMRC repayment", categoryKey: "HMRC_REFUND", confidence: 0.8 });
  } else {
    for (const r of ctx.recurring) {
      const keys = [...words(r.supplier), ...words(r.name)];
      const hit = keys.some(k => d.split(" ").includes(k));
      const close = r.amount > 0 && Math.abs(r.amount - abs) <= Math.max(1, r.amount * 0.1);
      if (hit || (close && Math.abs(r.amount - abs) < 0.01)) out.push({ kind: "RECURRING", label: `${r.name} (regular cost)`, categoryKey: r.categoryKey, recurringId: r.id, confidence: hit && close ? 0.93 : hit ? 0.75 : 0.5 });
    }
    for (const w of ctx.workers) {
      const ws = words(w.name);
      if (ws.length && ws.every(x => d.split(" ").includes(x))) out.push({ kind: "WORKER", label: `Pay to ${w.name}`, categoryKey: w.categoryKey, workerId: w.id, confidence: 0.85 });
      else if (ws.length >= 2 && d.split(" ").includes(ws[ws.length - 1])) out.push({ kind: "WORKER", label: `Pay to ${w.name}?`, categoryKey: w.categoryKey, workerId: w.id, confidence: 0.55 });
    }
    if (/\bHMRC\b/.test(d)) out.push({ kind: "SUPPLIER", label: /VAT/.test(d) ? "VAT to HMRC" : /(CIS|PAYE|NIC)/.test(d) ? "CIS / PAYE to HMRC" : /(CT|CORP)/.test(d) ? "Corporation Tax" : "Payment to HMRC", categoryKey: /VAT/.test(d) ? "HMRC_VAT" : /(CIS|PAYE|NIC)/.test(d) ? "HMRC_CIS_PAYE" : /(CT|CORP)/.test(d) ? "HMRC_CT" : "HMRC_VAT", confidence: 0.8 });
    for (const [re, cat, label] of SUPPLIERS) if (re.test(` ${d} `)) { out.push({ kind: "SUPPLIER", label, categoryKey: cat, confidence: 0.7 }); break; }
    if (/\b(CHARGE|CHARGES|COMMISSION|SERVICE FEE|ACCOUNT FEE|OVERDRAFT|ARRANGEMENT FEE|NON STERLING)\b/.test(d) && abs < 200) out.push({ kind: "SUPPLIER", label: "Bank charges", categoryKey: "BANK_CHARGES", confidence: 0.75 });
    if (/\b(ATM|CASH WITHDRAWAL|CASH MACHINE|CASHPOINT|LINK )\b/.test(d)) out.push({ kind: "TRANSFER", label: "Cash withdrawn (goes into the cash book)", categoryKey: "CASH_WITHDRAWAL", confidence: 0.8 });
  }
  // Keep the best suggestion per target.
  const best = new Map<string, Suggestion>();
  for (const s of out) { const k = `${s.kind}|${s.categoryKey}|${s.quoteId ?? ""}|${s.workerId ?? ""}|${s.recurringId ?? ""}|${s.paymentId ?? ""}|${s.entryId ?? ""}|${s.expenseId ?? ""}`; if (!best.has(k) || best.get(k)!.confidence < s.confidence) best.set(k, s); }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
