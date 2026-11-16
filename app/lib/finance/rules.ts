// UK rules for a limited company in construction: VAT (standard accounting, quarterly, domestic reverse charge),
// CIS (Construction Industry Scheme), Corporation Tax (small profits rate / marginal relief) and filing deadlines.
// Pure functions on "YYYY-MM-DD" dates – no database, so they are easy to test and to check by hand.
//
// Figures are an estimate for running the business. The accountant's figures are the ones filed with HMRC.

// ---------------------------------------------------------------- Dates

export type Day = string; // YYYY-MM-DD
const pad = (n: number) => String(n).padStart(2, "0");
export const toDay = (d: Date): Day => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const parseDay = (s: Day) => new Date(`${s}T00:00:00Z`);
export const isDay = (s: unknown): s is Day => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseDay(s).getTime()) && toDay(parseDay(s)) === s;
export const addDays = (s: Day, n: number): Day => { const d = parseDay(s); d.setUTCDate(d.getUTCDate() + n); return toDay(d); };
const daysInMonth = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
export const isMonthEnd = (s: Day) => { const d = parseDay(s); return d.getUTCDate() === daysInMonth(d.getUTCFullYear(), d.getUTCMonth()); };
/** Add calendar months; month-ends stay month-ends (31 Mar + 1 month = 30 Apr), other days are clamped. */
export function addMonths(s: Day, n: number): Day {
  const d = parseDay(s), y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
  const ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12, last = daysInMonth(ty, tm);
  return toDay(new Date(Date.UTC(ty, tm, isMonthEnd(s) ? last : Math.min(day, last))));
}
export const daysBetween = (a: Day, b: Day) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000); // b − a
export const monthKey = (s: Day) => s.slice(0, 7);
export const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
export const ukDate = (s: Day) => parseDay(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// ---------------------------------------------------------------- Settings (entered once)

export interface FinanceSettings {
  /** Company incorporation date = start of the first accounting period. */
  incorporationDate: Day | null;
  /** Accounting reference date (year end), "MM-DD", e.g. "03-31". */
  yearEnd: string;
  /** Optional: end of the first accounting period if it isn't simply the first year end. */
  firstPeriodEnd: Day | null;
  /** Number of associated companies (shares the £50k / £250k Corporation Tax limits). Usually 0. */
  associatedCompanies: number;
  vatRegistered: boolean;
  /** CASH = VAT Cash Accounting Scheme: VAT counts when money is received / paid. STANDARD = on the invoice / receipt date. */
  vatScheme: "CASH" | "STANDARD";
  vatNumber: string;
  /** Effective date of VAT registration (start of the first VAT period). */
  vatRegistrationDate: Day | null;
  /** End of the first VAT return period (sets the quarter "stagger", e.g. 2026-03-31 → Mar/Jun/Sep/Dec). */
  vatFirstPeriodEnd: Day | null;
  /** We pay subcontractors under CIS (must file monthly CIS returns). */
  cisContractor: boolean;
  /** Our own CIS status when other contractors pay us: 0 (gross), 20 or 30. */
  cisOwnRate: 0 | 20 | 30;
  utr: string;
  companyNumber: string;
}
export const DEFAULT_SETTINGS: FinanceSettings = {
  incorporationDate: null, yearEnd: "03-31", firstPeriodEnd: null, associatedCompanies: 0,
  vatRegistered: true, vatScheme: "CASH", vatNumber: "", vatRegistrationDate: null, vatFirstPeriodEnd: null,
  cisContractor: true, cisOwnRate: 20, utr: "", companyNumber: "",
};
export function normaliseSettings(raw: unknown): FinanceSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = (k: string) => (isDay(r[k]) ? (r[k] as Day) : null);
  const ye = typeof r.yearEnd === "string" && /^\d{2}-\d{2}$/.test(r.yearEnd) && isDay(`2023-${r.yearEnd}`) ? r.yearEnd : DEFAULT_SETTINGS.yearEnd;
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, 40) : "");
  return {
    incorporationDate: d("incorporationDate"), yearEnd: ye, firstPeriodEnd: d("firstPeriodEnd"),
    associatedCompanies: Math.max(0, Math.min(50, Math.floor(Number(r.associatedCompanies) || 0))),
    vatRegistered: r.vatRegistered === undefined ? DEFAULT_SETTINGS.vatRegistered : !!r.vatRegistered,
    vatScheme: r.vatScheme === "STANDARD" ? "STANDARD" : "CASH",
    vatNumber: s("vatNumber"), vatRegistrationDate: d("vatRegistrationDate"), vatFirstPeriodEnd: d("vatFirstPeriodEnd"),
    cisContractor: r.cisContractor === undefined ? true : !!r.cisContractor,
    cisOwnRate: r.cisOwnRate === 0 || r.cisOwnRate === 30 ? r.cisOwnRate : 20,
    utr: s("utr"), companyNumber: s("companyNumber"),
  };
}

// ---------------------------------------------------------------- Categories

export type CategoryGroup = "INCOME" | "COST_OF_SALES" | "OVERHEAD" | "NOT_DEDUCTIBLE" | "CAPITAL" | "NOT_PL";
export type VatTreatment = "STANDARD" | "REDUCED" | "ZERO" | "EXEMPT" | "OUTSIDE" | "REVERSE_CHARGE";
export interface Category { key: string; label: string; group: CategoryGroup; dir: "IN" | "OUT"; vat: VatTreatment; jobCost?: boolean; hint?: string; vatNotReclaimable?: boolean; capital?: "AIA" | "CAR" }

export const CATEGORIES: Category[] = [
  // Money in
  { key: "SALES", label: "Sales – job income", group: "INCOME", dir: "IN", vat: "STANDARD" },
  { key: "SALES_DRC", label: "Sales to builders (reverse charge)", group: "INCOME", dir: "IN", vat: "REVERSE_CHARGE", hint: "CIS work for a VAT-registered contractor: no VAT on the invoice" },
  { key: "OTHER_INCOME", label: "Other income (interest, scrap…)", group: "INCOME", dir: "IN", vat: "OUTSIDE" },
  { key: "REFUND_IN", label: "Supplier refund", group: "INCOME", dir: "IN", vat: "STANDARD" },
  { key: "DIRECTOR_LOAN_IN", label: "Money from director", group: "NOT_PL", dir: "IN", vat: "OUTSIDE" },
  { key: "LOAN_IN", label: "Loan received", group: "NOT_PL", dir: "IN", vat: "OUTSIDE" },
  { key: "HMRC_REFUND", label: "HMRC repayment (VAT / CIS / CT)", group: "NOT_PL", dir: "IN", vat: "OUTSIDE" },
  { key: "TRANSFER_IN", label: "Transfer from own account", group: "NOT_PL", dir: "IN", vat: "OUTSIDE" },
  { key: "CASH_DEPOSIT", label: "Cash paid into the bank (from the cash box)", group: "NOT_PL", dir: "IN", vat: "OUTSIDE" },
  // Job costs (cost of sales)
  { key: "MATERIALS", label: "Materials", group: "COST_OF_SALES", dir: "OUT", vat: "STANDARD", jobCost: true },
  { key: "SUBCONTRACTOR", label: "Subcontractor (CIS)", group: "COST_OF_SALES", dir: "OUT", vat: "OUTSIDE", jobCost: true, hint: "CIS worked out from the subcontractor's status; reverse charge if they are VAT registered" },
  { key: "LABOUR", label: "Labour / day rate", group: "COST_OF_SALES", dir: "OUT", vat: "OUTSIDE", jobCost: true },
  { key: "PLANT", label: "Plant & tool hire", group: "COST_OF_SALES", dir: "OUT", vat: "STANDARD", jobCost: true },
  { key: "SKIPS", label: "Skips & waste", group: "COST_OF_SALES", dir: "OUT", vat: "STANDARD", jobCost: true },
  { key: "JOB_FEES", label: "Permits, building control, surveys", group: "COST_OF_SALES", dir: "OUT", vat: "STANDARD", jobCost: true },
  { key: "JOB_OTHER", label: "Other job cost", group: "COST_OF_SALES", dir: "OUT", vat: "STANDARD", jobCost: true },
  // Company running costs
  { key: "INSURANCE", label: "Insurance", group: "OVERHEAD", dir: "OUT", vat: "EXEMPT", hint: "Insurance is VAT exempt (Insurance Premium Tax instead)" },
  { key: "MEMBERSHIPS", label: "Checkatrade, trade bodies, memberships", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "SOFTWARE", label: "Software & subscriptions", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "VEHICLE_RUNNING", label: "Van: fuel, repairs, road tax, parking", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "PHONE_INTERNET", label: "Phone & internet", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "OFFICE", label: "Office, yard, rent, utilities", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "MARKETING", label: "Advertising & marketing", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "PROFESSIONAL", label: "Accountant, legal, professional fees", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "BANK_CHARGES", label: "Bank charges & interest", group: "OVERHEAD", dir: "OUT", vat: "EXEMPT" },
  { key: "SMALL_TOOLS", label: "Small tools & PPE", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "STAFF_WAGES", label: "Staff wages (payroll)", group: "OVERHEAD", dir: "OUT", vat: "OUTSIDE" },
  { key: "DIRECTOR_SALARY", label: "Director salary (payroll)", group: "OVERHEAD", dir: "OUT", vat: "OUTSIDE" },
  { key: "TRAINING", label: "Training & cards (CSCS…)", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "TRAVEL", label: "Travel & accommodation", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  { key: "OTHER_OVERHEAD", label: "Other running cost", group: "OVERHEAD", dir: "OUT", vat: "STANDARD" },
  // Not allowed for Corporation Tax
  { key: "ENTERTAINING", label: "Client entertaining", group: "NOT_DEDUCTIBLE", dir: "OUT", vat: "STANDARD", vatNotReclaimable: true, hint: "Not deductible for Corporation Tax; VAT can't be reclaimed" },
  { key: "FINES", label: "Fines & penalties", group: "NOT_DEDUCTIBLE", dir: "OUT", vat: "OUTSIDE" },
  // Bought to keep (capital allowances instead of an expense)
  { key: "EQUIPMENT", label: "Tools & machinery (to keep)", group: "CAPITAL", dir: "OUT", vat: "STANDARD", capital: "AIA" },
  { key: "VEHICLE_VAN", label: "Van purchase", group: "CAPITAL", dir: "OUT", vat: "STANDARD", capital: "AIA" },
  { key: "VEHICLE_CAR", label: "Car purchase", group: "CAPITAL", dir: "OUT", vat: "STANDARD", capital: "CAR", vatNotReclaimable: true, hint: "VAT on cars usually can't be reclaimed; 18% a year writing-down allowance" },
  // Not costs: tax payments, money to the director, loans, transfers
  { key: "HMRC_VAT", label: "VAT paid to HMRC", group: "NOT_PL", dir: "OUT", vat: "OUTSIDE" },
  { key: "HMRC_CIS_PAYE", label: "CIS / PAYE paid to HMRC", group: "NOT_PL", dir: "OUT", vat: "OUTSIDE" },
  { key: "HMRC_CT", label: "Corporation Tax paid", group: "NOT_PL", dir: "OUT", vat: "OUTSIDE" },
  { key: "DIVIDENDS", label: "Dividends", group: "NOT_PL", dir: "OUT", vat: "OUTSIDE" },
  { key: "DIRECTOR_LOAN_OUT", label: "Money to director (loan account)", group: "NOT_PL", dir: "OUT", vat: "OUTSIDE" },
  { key: "LOAN_REPAYMENT", label: "Loan repayment", group: "NOT_PL", dir: "OUT", vat: "OUTSIDE" },
  { key: "TRANSFER_OUT", label: "Transfer to own account", group: "NOT_PL", dir: "OUT", vat: "OUTSIDE" },
  { key: "CASH_WITHDRAWAL", label: "Cash taken out (into the cash box)", group: "NOT_PL", dir: "OUT", vat: "OUTSIDE" },
];
const CAT = new Map(CATEGORIES.map(c => [c.key, c]));
/** Existing job-expense categories (Jobs → Money) map onto these. */
const LEGACY: Record<string, string> = { FEES: "JOB_FEES", OTHER: "JOB_OTHER" };
export const category = (key: string): Category => CAT.get(key) ?? CAT.get(LEGACY[key] ?? "") ?? (CAT.get("JOB_OTHER") as Category);
export const categoriesFor = (dir: "IN" | "OUT") => CATEGORIES.filter(c => c.dir === dir);

export const VAT_RATE: Record<VatTreatment, number> = { STANDARD: 20, REDUCED: 5, ZERO: 0, EXEMPT: 0, OUTSIDE: 0, REVERSE_CHARGE: 20 };
export const VAT_LABEL: Record<VatTreatment, string> = {
  STANDARD: "20% VAT", REDUCED: "5% VAT", ZERO: "0% (zero-rated)", EXEMPT: "Exempt", OUTSIDE: "No VAT", REVERSE_CHARGE: "Reverse charge (20%)",
};
/** VAT inside a VAT-inclusive amount. Reverse charge: the amount has no VAT on it; VAT is 20% of it (accounted for by the customer). */
export function vatFor(amount: number, t: VatTreatment) {
  if (t === "REVERSE_CHARGE") return r2(amount * 0.2);
  const rate = VAT_RATE[t];
  return rate ? r2(amount * rate / (100 + rate)) : 0;
}
/** Net (ex VAT) value of an amount. */
export const netOf = (amount: number, vat: number, t: VatTreatment) => (t === "REVERSE_CHARGE" ? r2(amount) : r2(amount - vat));

// ---------------------------------------------------------------- CIS

export type CisStatus = "NONE" | "GROSS" | "NET20" | "NET30";
export const CIS_RATE: Record<CisStatus, number> = { NONE: 0, GROSS: 0, NET20: 20, NET30: 30 };
export const CIS_LABEL: Record<CisStatus, string> = { NONE: "Not under CIS (employee / not construction)", GROSS: "CIS – gross status (0%)", NET20: "CIS – registered (20%)", NET30: "CIS – not registered (30%)" };
/** CIS deduction: % of the labour part only (never materials or VAT), rounded down to the penny as HMRC does. */
export function cisDeduction(labour: number, status: CisStatus) {
  return Math.floor(Math.max(0, labour) * CIS_RATE[status]) / 100;
}
/** CIS tax month containing a date: 6th of one month to 5th of the next. Return due 19th, payment due 22nd. */
export function cisMonth(s: Day) {
  const d = parseDay(s), y = d.getUTCFullYear(), m = d.getUTCMonth(), startMonth = d.getUTCDate() >= 6 ? m : m - 1;
  const start = toDay(new Date(Date.UTC(y, startMonth, 6))), end = addDays(addMonths(start, 1), -1);
  const after = addMonths(start, 1); // 6th of the following month
  return { key: end.slice(0, 7), start, end, returnDue: addDays(after, 13), paymentDue: addDays(after, 16), label: `${ukDate(start)} – ${ukDate(end)}` };
}

// ---------------------------------------------------------------- VAT periods

export interface VatPeriod { key: string; start: Day; end: Day; due: Day; label: string }
/** VAT return due date: one calendar month and seven days after the period ends. */
export const vatDue = (end: Day) => addDays(addMonths(end, 1), 7);
/** Quarterly VAT periods from registration (the first one can be longer or shorter), up to `until`. */
export function vatPeriods(s: FinanceSettings, until: Day): VatPeriod[] {
  if (!s.vatRegistered || !s.vatRegistrationDate || !s.vatFirstPeriodEnd || s.vatFirstPeriodEnd < s.vatRegistrationDate) return [];
  const out: VatPeriod[] = [];
  let start = s.vatRegistrationDate, end = s.vatFirstPeriodEnd;
  for (let i = 0; i < 200 && start <= until; i++) {
    out.push({ key: end, start, end, due: vatDue(end), label: `${ukDate(start)} – ${ukDate(end)}` });
    start = addDays(end, 1);
    end = addMonths(s.vatFirstPeriodEnd, 3 * (i + 1)); // month-ends stay month-ends
  }
  return out;
}

// ---------------------------------------------------------------- Accounting periods & deadlines

export interface AccountsPeriod {
  key: string; start: Day; end: Day; label: string;
  /** Corporation Tax periods (an accounts period over 12 months is split: first 12 months, then the rest). */
  taxPeriods: { start: Day; end: Day }[];
  accountsDue: Day; ctPaymentDue: Day; ct600Due: Day; first: boolean;
}
function nextYearEnd(after: Day, yearEnd: string): Day {
  const y = Number(after.slice(0, 4));
  for (const yy of [y, y + 1, y + 2]) { const c = `${yy}-${yearEnd}`; if (isDay(c) && c >= after) return c; if (yearEnd === "02-29") { const f = `${yy}-02-28`; if (f >= after) return f; } }
  return `${y + 1}-${yearEnd}`;
}
export function accountsPeriods(s: FinanceSettings, until: Day): AccountsPeriod[] {
  if (!s.incorporationDate) return [];
  const out: AccountsPeriod[] = [];
  // First period: to the first year end at least 6 months after incorporation (or the end entered).
  let start = s.incorporationDate;
  let end = s.firstPeriodEnd && s.firstPeriodEnd > start ? s.firstPeriodEnd : nextYearEnd(addMonths(start, 6), s.yearEnd);
  for (let i = 0; i < 60 && start <= until; i++) {
    const first = i === 0;
    const taxPeriods: { start: Day; end: Day }[] = [];
    let ts = start;
    while (ts <= end) { const te = addDays(addMonths(ts, 12), -1) < end ? addDays(addMonths(ts, 12), -1) : end; taxPeriods.push({ start: ts, end: te }); ts = addDays(te, 1); }
    out.push({
      key: end, start, end, label: `${ukDate(start)} – ${ukDate(end)}`, taxPeriods, first,
      // Companies House: first accounts 21 months after incorporation, then 9 months after the year end.
      accountsDue: first ? (() => { const a = addMonths(s.incorporationDate!, 21), b = addMonths(end, 3); return a > b ? a : b; })() : addMonths(end, 9),
      ctPaymentDue: addDays(addMonths(taxPeriods[taxPeriods.length - 1].end, 9), 1),
      ct600Due: addMonths(end, 12),
    });
    start = addDays(end, 1);
    end = nextYearEnd(addMonths(start, 11), s.yearEnd);
  }
  return out;
}

// ---------------------------------------------------------------- Corporation Tax

/** Rates by financial year (FY2023 = 1 Apr 2023 – 31 Mar 2024). From FY2023: 19% up to £50k, 25% over £250k, marginal relief between. */
export function ctRates(fy: number) {
  return fy >= 2023 ? { small: 19, main: 25, lower: 50_000, upper: 250_000, fraction: 3 / 200 } : { small: 19, main: 19, lower: 0, upper: 0, fraction: 0 };
}
const fyOf = (s: Day) => { const y = Number(s.slice(0, 4)); return s.slice(5) >= "04-01" ? y : y - 1; };
/**
 * Corporation Tax on a taxable profit for one tax period (max 12 months). The profit is split across financial years
 * by days, and the £50k / £250k limits are scaled to the days in each part and shared with associated companies.
 */
export function corporationTax(profit: number, start: Day, end: Day, associated = 0) {
  const total = daysBetween(start, end) + 1;
  if (!(profit > 0) || total <= 0) return { tax: 0, effectiveRate: 0, parts: [] as { fy: number; days: number; profit: number; tax: number; band: string }[] };
  const parts: { fy: number; days: number; profit: number; tax: number; band: string }[] = [];
  let s = start;
  while (s <= end) {
    const fy = fyOf(s), fyEnd = `${fy + 1}-03-31`, e = fyEnd < end ? fyEnd : end, days = daysBetween(s, e) + 1;
    const p = profit * days / total, r = ctRates(fy);
    const lower = r.lower * days / 365 / (1 + associated), upper = r.upper * days / 365 / (1 + associated);
    let tax: number, band: string;
    if (r.small === r.main || p <= lower) { tax = p * r.small / 100; band = `${r.small}%`; }
    else if (p >= upper) { tax = p * r.main / 100; band = `${r.main}%`; }
    else { tax = p * r.main / 100 - r.fraction * (upper - p); band = `marginal relief`; }
    parts.push({ fy, days, profit: r2(p), tax: r2(tax), band });
    s = addDays(e, 1);
  }
  const tax = r2(parts.reduce((a, b) => a + b.tax, 0));
  return { tax, effectiveRate: r2(tax / profit * 100), parts };
}

// ---------------------------------------------------------------- Repeating costs

export type Frequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "ONE_OFF";
export const FREQUENCY_LABEL: Record<Frequency, string> = { WEEKLY: "Weekly", MONTHLY: "Monthly", QUARTERLY: "Every 3 months", ANNUAL: "Yearly", ONE_OFF: "One-off" };
/** Dates a repeating cost falls on between `from` and `to` (inclusive). */
export function occurrences(r: { frequency: Frequency; startDate: Day; endDate: Day | null }, from: Day, to: Day): Day[] {
  const out: Day[] = [], last = r.endDate && r.endDate < to ? r.endDate : to;
  if (r.frequency === "ONE_OFF") return r.startDate >= from && r.startDate <= last ? [r.startDate] : [];
  for (let i = 0; i < 2000; i++) {
    const d = r.frequency === "WEEKLY" ? addDays(r.startDate, 7 * i) : addMonths(r.startDate, i * (r.frequency === "MONTHLY" ? 1 : r.frequency === "QUARTERLY" ? 3 : 12));
    if (d > last) break;
    if (d >= from) out.push(d);
  }
  return out;
}
/** What a repeating cost works out at per month (for budgets). */
export const monthlyEquivalent = (amount: number, f: Frequency) => r2(f === "WEEKLY" ? amount * 52 / 12 : f === "MONTHLY" ? amount : f === "QUARTERLY" ? amount / 3 : f === "ANNUAL" ? amount / 12 : 0);

// ---------------------------------------------------------------- VAT return (9 boxes)

/** One line of business for the VAT return. amount = what was charged/paid (VAT inclusive, except reverse charge). */
export interface VatLine { date: Day; dir: "IN" | "OUT"; amount: number; vat: number; treatment: VatTreatment; categoryKey: string }
export interface VatReturn { box1: number; box2: number; box3: number; box4: number; box5: number; box6: number; box7: number; box8: number; box9: number; drcOutput: number; lines: number }
export function vatReturn(lines: VatLine[]): VatReturn {
  let b1 = 0, b4 = 0, b6 = 0, b7 = 0, drc = 0;
  for (const l of lines) {
    const c = category(l.categoryKey);
    if (c.group === "NOT_PL" || (l.treatment === "OUTSIDE" && c.group !== "INCOME" && c.group !== "CAPITAL")) continue; // wages, HMRC, loans, transfers: not on the return
    const net = netOf(l.amount, l.vat, l.treatment);
    if (l.dir === "IN") {
      if (c.group !== "INCOME" || l.treatment === "OUTSIDE") continue; // interest etc. – outside the scope of VAT
      if (l.treatment === "REVERSE_CHARGE") { b6 += net; continue; } // our customer accounts for the VAT
      b1 += l.vat; b6 += net;
    } else {
      if (l.treatment === "REVERSE_CHARGE") { // domestic reverse charge: we account for the supplier's VAT and reclaim it
        const v = l.vat || vatFor(net, "REVERSE_CHARGE");
        b1 += v; b4 += v; drc += v; b7 += net; continue;
      }
      if (!c.vatNotReclaimable) b4 += l.vat;
      b7 += c.vatNotReclaimable ? l.amount : net;
    }
  }
  const box1 = r2(b1), box2 = 0, box3 = r2(box1 + box2), box4 = r2(b4);
  // Boxes 6–9 are whole pounds.
  // Box 5: positive = to pay HMRC, negative = HMRC owes us.
  return { box1, box2, box3, box4, box5: r2(box3 - box4), box6: Math.floor(b6), box7: Math.floor(b7), box8: 0, box9: 0, drcOutput: r2(drc), lines: lines.length };
}

// ---------------------------------------------------------------- Profit & loss

export interface PnlLine { categoryKey: string; dir: "IN" | "OUT"; amount: number; vat: number; treatment: VatTreatment; date: Day }
export function profitAndLoss(lines: PnlLine[], vatRegistered: boolean) {
  const by = new Map<string, number>();
  let turnover = 0, costOfSales = 0, overheads = 0, notDeductible = 0, otherIncome = 0, capitalAia = 0, capitalCar = 0;
  for (const l of lines) {
    const c = category(l.categoryKey);
    // VAT-registered: income and costs are shown without VAT (except VAT we can't reclaim).
    const value = vatRegistered && !c.vatNotReclaimable ? netOf(l.amount, l.vat, l.treatment) : l.amount;
    by.set(c.key, r2((by.get(c.key) ?? 0) + value));
    if (c.group === "INCOME") { if (c.key === "OTHER_INCOME") otherIncome += value; else if (c.key === "REFUND_IN") costOfSales -= value; else turnover += value; }
    else if (c.group === "COST_OF_SALES") costOfSales += value;
    else if (c.group === "OVERHEAD") overheads += value;
    else if (c.group === "NOT_DEDUCTIBLE") notDeductible += value;
    else if (c.group === "CAPITAL") { if (c.capital === "CAR") capitalCar += value; else capitalAia += value; }
  }
  const grossProfit = turnover - costOfSales, netProfit = grossProfit + otherIncome - overheads - notDeductible;
  // Tax adjustments: add back non-deductible costs; capital allowances for things bought to keep
  // (Annual Investment Allowance: 100% for tools, machinery and vans; cars: 18% writing-down allowance, first year).
  const capitalAllowances = capitalAia + capitalCar * 0.18;
  const taxableProfit = netProfit + notDeductible - capitalAllowances;
  return {
    byCategory: [...by.entries()].map(([key, amount]) => ({ key, label: category(key).label, group: category(key).group, amount })).sort((a, b) => b.amount - a.amount),
    turnover: r2(turnover), costOfSales: r2(costOfSales), grossProfit: r2(grossProfit), grossMargin: turnover ? r2(grossProfit / turnover * 100) : 0,
    otherIncome: r2(otherIncome), overheads: r2(overheads), notDeductible: r2(notDeductible), netProfit: r2(netProfit),
    capitalAia: r2(capitalAia), capitalCar: r2(capitalCar), capitalAllowances: r2(capitalAllowances), taxableProfit: r2(taxableProfit),
  };
}
