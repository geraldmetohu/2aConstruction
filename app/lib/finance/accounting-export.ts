// Exports for the accountant: Xero sales invoices, Xero bills (costs) and a plain bank-style transactions
// file that QuickBooks, FreeAgent, Sage or a spreadsheet can import. Pure functions – they take the same
// ReportInput the finance pages use, so the numbers always match what the dashboard shows.
import { buildMoves, type ReportInput } from "./report";
import { category, type VatTreatment } from "./rules";

const r2 = (n: number) => Math.round(n * 100) / 100;
const cell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (rows: unknown[][]) => "﻿" + rows.map(r => r.map(cell).join(",")).join("\r\n") + "\r\n";
/** Xero (UK) wants dates as day/month/year. */
const ukDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

/** Xero UK standard chart of accounts codes for our categories (change them in Xero's import screen if yours differ). */
const XERO_ACCOUNT: Record<string, string> = {
  SALES: "200", SALES_DRC: "200", OTHER_INCOME: "260", REFUND_IN: "310",
  MATERIALS: "310", SUBCONTRACTOR: "310", LABOUR: "310", PLANT: "310", SKIPS: "310", JOB_FEES: "310", JOB_OTHER: "310",
  INSURANCE: "433", MEMBERSHIPS: "485", SOFTWARE: "485", VEHICLE_RUNNING: "449", PHONE_INTERNET: "489", OFFICE: "469", MARKETING: "400",
  PROFESSIONAL: "412", BANK_CHARGES: "404", SMALL_TOOLS: "429", STAFF_WAGES: "477", DIRECTOR_SALARY: "477", TRAINING: "429", TRAVEL: "493", OTHER_OVERHEAD: "429",
  ENTERTAINING: "420", FINES: "429", EQUIPMENT: "710", VEHICLE_VAN: "710", VEHICLE_CAR: "710",
};
function xeroTax(t: VatTreatment, dir: "IN" | "OUT", registered: boolean) {
  if (!registered) return "No VAT";
  const side = dir === "IN" ? "Income" : "Expenses";
  switch (t) {
    case "STANDARD": return `20% (VAT on ${side})`;
    case "REDUCED": return `5% (VAT on ${side})`;
    case "ZERO": return `Zero Rated ${side}`;
    case "EXEMPT": return `Exempt ${side}`;
    case "REVERSE_CHARGE": return dir === "IN" ? "Domestic Reverse Charge @ 20% (VAT on Income)" : "Reverse Charge Expenses (20%)";
    default: return "No VAT";
  }
}

/** Xero "Sales invoice" import (amounts are tax exclusive – choose that option when importing). */
export function xeroSalesCsv(x: ReportInput, from: string, to: string) {
  const job = new Map(x.jobs.map(j => [j.quoteId, j]));
  const reg = x.settings.vatRegistered;
  const rows: unknown[][] = [["*ContactName", "EmailAddress", "POAddressLine1", "*InvoiceNumber", "Reference", "*InvoiceDate", "*DueDate", "*Description", "*Quantity", "*UnitAmount", "*AccountCode", "*TaxType", "TaxAmount", "Currency"]];
  for (const i of x.invoices.filter(i => inRange(i.issuedOn, from, to)).sort((a, b) => a.issuedOn.localeCompare(b.issuedOn) || a.number.localeCompare(b.number))) {
    const j = job.get(i.quoteId);
    rows.push([j?.clientName ?? "Client", "", (j?.siteAddress ?? "").replace(/\n/g, ", "), i.number, j?.reference ?? "", ukDate(i.issuedOn), ukDate(i.dueOn), i.label, 1, r2(i.net), "200",
      xeroTax(i.vat > 0 ? "STANDARD" : "ZERO", "IN", reg), r2(i.vat), "GBP"]);
  }
  return { csv: toCsv(rows), count: rows.length - 1 };
}

/** Xero "Bills" import: every cost (job costs and running costs) – not tax payments, transfers or loans. */
export function xeroBillsCsv(x: ReportInput, from: string, to: string) {
  const { entryMoves, expenseMoves } = buildMoves(x);
  const reg = x.settings.vatRegistered;
  const job = new Map(x.jobs.map(j => [j.quoteId, j.reference]));
  const rows: unknown[][] = [["*ContactName", "*InvoiceNumber", "Reference", "*InvoiceDate", "*DueDate", "*Description", "*Quantity", "*UnitAmount", "*AccountCode", "*TaxType", "TaxAmount", "Currency"]];
  for (const m of [...entryMoves, ...expenseMoves].filter(m => m.dir === "OUT" && inRange(m.date, from, to) && category(m.categoryKey).group !== "NOT_PL").sort((a, b) => a.date.localeCompare(b.date))) {
    const c = category(m.categoryKey), net = reg ? r2(m.amount - m.vat) : r2(m.amount);
    rows.push([m.label || c.label, `2A-${m.source === "EXPENSE" ? "JC" : "CO"}-${m.id.slice(0, 8)}`, m.quoteId ? job.get(m.quoteId) ?? "" : "", ukDate(m.date), ukDate(m.date),
      `${c.label}${m.label && m.label !== c.label ? ` – ${m.label}` : ""}`, 1, net, XERO_ACCOUNT[c.key] ?? "429", xeroTax(m.treatment, "OUT", reg), reg ? r2(m.vat) : 0, "GBP"]);
  }
  return { csv: toCsv(rows), count: rows.length - 1 };
}

/** Every money movement (in and out) as one simple list: date, amount (+ in, − out), who, what, category, VAT, job. */
export function transactionsCsv(x: ReportInput, from: string, to: string) {
  const { cash } = buildMoves(x);
  const job = new Map(x.jobs.map(j => [j.quoteId, j.reference]));
  const rows: unknown[][] = [["Date", "Amount", "Direction", "Payee / payer", "Description", "Category", "Category group", "VAT", "CIS deducted", "Paid by", "Job", "Source", "Id"]];
  for (const m of cash.filter(m => inRange(m.date, from, to)).sort((a, b) => a.date.localeCompare(b.date))) {
    const c = category(m.categoryKey);
    rows.push([m.date, r2(m.dir === "IN" ? m.amount : -m.amount), m.dir, m.label, c.label, c.key, c.group, r2(m.vat), r2(m.cisDeducted), m.method, m.quoteId ? job.get(m.quoteId) ?? "" : "", m.source, m.id]);
  }
  return { csv: toCsv(rows), count: rows.length - 1 };
}
