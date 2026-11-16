// Builds every finance figure from the raw records: jobs, company costs, workers & CIS, cash, VAT returns, year end.
// Pure (no database) so it can be tested and checked by hand.
//
// Two views of the same money:
// - "accounts" (accruals, what HMRC and the accounts use): sales on the invoice date, costs on the invoice/receipt date;
// - "cash" (what really moved): money in and out of the bank and the cash box on the day it moved.

import {
  accountsPeriods, addDays, addMonths, category, cisMonth, corporationTax, daysBetween, monthKey, monthlyEquivalent, netOf, occurrences, profitAndLoss, r2, vatPeriods, vatReturn,
  type CisStatus, type Day, type FinanceSettings, type Frequency, type PnlLine, type VatLine, type VatTreatment,
} from "./rules";

export interface REntry {
  id: string; date: Day; direction: "IN" | "OUT"; method: "BANK" | "CASH" | "CARD"; category: string; description: string; counterparty: string;
  quoteId: string | null; workerId: string | null; jobCostId: string | null; recurringId: string | null;
  amount: number; vat: number; vatTreatment: VatTreatment; cisLabour: number; cisMaterials: number; cisDeducted: number; days: number | null; bankLineId: string | null;
}
export interface RExpense { id: string; quoteId: string | null; workerId: string | null; category: string; description: string; supplier: string; amount: number; vat: number; vatTreatment: VatTreatment; method: "BANK" | "CASH" | "CARD"; spentOn: Day; bankLineId: string | null }
export interface RPayment { id: string; quoteId: string; amount: number; paidOn: Day; method: string; status: string; reference: string; linked: boolean }
export interface RInvoice { quoteId: string; number: string; label: string; issuedOn: Day; dueOn: Day; net: number; vat: number; gross: number }
export interface RJob { quoteId: string; reference: string; clientName: string; siteAddress: string; jobStatus: string; contractNet: number; contractGross: number; plannedCost: number; vatPercent: number; acceptedAt: Day | null }
export interface RJobCost { id: string; quoteId: string; workerId: string | null; supplier: string; title: string; category: string; amount: number; labour: number; vatTreatment: VatTreatment; dueDate: Day | null; status: string; paid: number; cisDeducted: number }
export interface RRecurring { id: string; name: string; category: string; supplier: string; amount: number; vat: number; vatTreatment: VatTreatment; frequency: Frequency; startDate: Day; endDate: Day | null; active: boolean }
export interface RWorker { id: string; name: string; kind: string; trade: string; payBasis: string; dayRate: number | null; active: boolean; cisStatus: CisStatus; utr: string; vatNumber: string; verificationNumber: string }
export interface RAssignment { quoteId: string; workerId: string; payBasis: string; dayRate: number | null; agreedPrice: number | null }
export interface ReportInput {
  today: Day; settings: FinanceSettings;
  entries: REntry[]; expenses: RExpense[]; payments: RPayment[]; invoices: RInvoice[]; jobs: RJob[]; jobCosts: RJobCost[];
  recurring: RRecurring[]; workers: RWorker[]; assignments: RAssignment[]; workDays: { workerId: string; quoteId: string; day: Day }[];
  bank: { toDo: number; lastClosing: number | null; lastDate: Day | null; statements: number };
}

const sum = <T,>(xs: T[], f: (x: T) => number) => r2(xs.reduce((s, x) => s + f(x), 0));
const within = (d: Day, a: Day, b: Day) => d >= a && d <= b;

/** One money movement in the common shape used by every report. */
export interface Move {
  id: string; source: "ENTRY" | "EXPENSE" | "PAYMENT" | "INVOICE"; date: Day; dir: "IN" | "OUT"; categoryKey: string;
  amount: number; vat: number; treatment: VatTreatment; cisDeducted: number; method: "BANK" | "CASH" | "CARD";
  quoteId: string | null; workerId: string | null; label: string; inBank: boolean;
}

export function buildMoves(x: ReportInput) {
  const invoicedJobs = new Set(x.invoices.map(i => i.quoteId));
  const vatPct = new Map(x.jobs.map(j => [j.quoteId, j.vatPercent || 0]));
  const ref = new Map(x.jobs.map(j => [j.quoteId, j.reference]));
  const entryMoves: Move[] = x.entries.map(e => ({
    id: e.id, source: "ENTRY", date: e.date, dir: e.direction, categoryKey: e.category, amount: e.amount, vat: e.vat, treatment: e.vatTreatment, cisDeducted: e.cisDeducted,
    method: e.method, quoteId: e.quoteId, workerId: e.workerId, label: e.counterparty || e.description || category(e.category).label, inBank: !!e.bankLineId,
  }));
  const expenseMoves: Move[] = x.expenses.map(e => ({
    id: e.id, source: "EXPENSE", date: e.spentOn, dir: "OUT", categoryKey: category(e.category).key, amount: e.amount, vat: e.vat, treatment: e.vatTreatment, cisDeducted: 0,
    method: e.method, quoteId: e.quoteId, workerId: e.workerId, label: e.supplier || e.description || category(e.category).label, inBank: !!e.bankLineId,
  }));
  const paymentMoves: Move[] = x.payments.filter(p => p.status === "CONFIRMED").map(p => {
    const v = vatPct.get(p.quoteId) ?? 20;
    return { id: p.id, source: "PAYMENT", date: p.paidOn, dir: "IN", categoryKey: "SALES", amount: p.amount, vat: r2(p.amount * v / (100 + v)), treatment: v ? "STANDARD" : "OUTSIDE", cisDeducted: 0,
      method: p.method === "CASH" ? "CASH" : "BANK", quoteId: p.quoteId, workerId: null, label: `Payment ${ref.get(p.quoteId) ?? ""}`.trim(), inBank: p.linked } as Move;
  });
  const invoiceMoves: Move[] = x.invoices.map(i => ({
    id: i.number, source: "INVOICE", date: i.issuedOn, dir: "IN", categoryKey: "SALES", amount: i.gross, vat: i.vat, treatment: i.vat > 0 ? "STANDARD" : "ZERO", cisDeducted: 0,
    method: "BANK", quoteId: i.quoteId, workerId: null, label: `Invoice ${i.number}`, inBank: false,
  }));
  /** Accruals: sales are invoices (or, for jobs without invoices, the payments received); a job receipt of an invoiced job is not a sale again. */
  const accounts: Move[] = [
    ...invoiceMoves,
    ...paymentMoves.filter(p => !invoicedJobs.has(p.quoteId!)),
    ...entryMoves.filter(e => !(e.dir === "IN" && e.categoryKey === "SALES" && e.quoteId && invoicedJobs.has(e.quoteId))),
    ...expenseMoves,
  ];
  /** Cash: what actually moved (CIS deducted never left the bank – it goes to HMRC with the CIS return). */
  const cash: Move[] = [...paymentMoves, ...entryMoves, ...expenseMoves];
  return { accounts, cash, entryMoves, expenseMoves, paymentMoves, invoiceMoves };
}
const paidOf = (m: Move) => r2(m.amount - m.cisDeducted);
const toVat = (m: Move): VatLine => ({ date: m.date, dir: m.dir, amount: m.amount, vat: m.vat, treatment: m.treatment, categoryKey: m.categoryKey });
const toPnl = (m: Move): PnlLine => ({ date: m.date, dir: m.dir, amount: m.amount, vat: m.vat, treatment: m.treatment, categoryKey: m.categoryKey });

export function buildReport(x: ReportInput) {
  const { today, settings: s } = x;
  const reg = s.vatRegistered;
  const { accounts, cash } = buildMoves(x);
  const valueOf = (m: Move) => (reg && !category(m.categoryKey).vatNotReclaimable ? netOf(m.amount, m.vat, m.treatment) : m.amount);
  const jobRef = new Map(x.jobs.map(j => [j.quoteId, j]));
  const workerById = new Map(x.workers.map(w => [w.id, w]));

  // ------------------------------------------------ Months (last 12): accounts profit and cash movement
  const months: { month: string; income: number; costs: number; overheads: number; profit: number; cashIn: number; cashOut: number; taxPaid: number; expected: number }[] = [];
  const startMonth = addMonths(`${monthKey(today)}-01`, -11);
  for (let i = 0; i < 12; i++) {
    const from = addMonths(startMonth, i), to = addDays(addMonths(from, 1), -1), key = monthKey(from);
    const acc = accounts.filter(m => within(m.date, from, to));
    const pl = profitAndLoss(acc.map(toPnl), reg);
    const c = cash.filter(m => within(m.date, from, to));
    const realIn = c.filter(m => m.dir === "IN" && category(m.categoryKey).group !== "NOT_PL");
    const realOut = c.filter(m => m.dir === "OUT" && category(m.categoryKey).group !== "NOT_PL");
    const expected = sum(x.recurring.filter(r => r.active), r => occurrences(r, from, to).length * r.amount);
    months.push({ month: key, income: r2(pl.turnover + pl.otherIncome), costs: pl.costOfSales, overheads: r2(pl.overheads + pl.notDeductible), profit: pl.netProfit,
      cashIn: sum(realIn, paidOf), cashOut: sum(realOut, paidOf), taxPaid: sum(c.filter(m => /^HMRC_(VAT|CT|CIS_PAYE)$/.test(m.categoryKey)), paidOf), expected });
  }

  // Days on site × rate (day workers) or the agreed price (price workers), and what each has been paid, per job.
  function workerOwed() {
    const days = new Map<string, Set<Day>>();
    for (const d of x.workDays) { const k = `${d.workerId}|${d.quoteId}`; if (!days.has(k)) days.set(k, new Set()); days.get(k)!.add(d.day); }
    const rows: { workerId: string; quoteId: string; days: number; rate: number; owed: number; paid: number; basis: string }[] = [];
    const keys = new Set([...days.keys(), ...x.assignments.map(a => `${a.workerId}|${a.quoteId}`)]);
    for (const k of keys) {
      const [workerId, quoteId] = k.split("|");
      const a = x.assignments.find(z => z.workerId === workerId && z.quoteId === quoteId), w = workerById.get(workerId);
      const basis = a?.payBasis ?? w?.payBasis ?? "DAY", rate = a?.dayRate ?? w?.dayRate ?? 0, n = days.get(k)?.size ?? 0;
      const owed = basis === "JOB" ? (a?.agreedPrice ?? 0) : r2(n * rate);
      const paid = sum([...x.entries.filter(e => e.direction === "OUT" && e.workerId === workerId && e.quoteId === quoteId), ...x.expenses.filter(e => e.workerId === workerId && e.quoteId === quoteId).map(e => ({ amount: e.amount }))], e => e.amount);
      rows.push({ workerId, quoteId, days: n, rate, owed, paid, basis });
    }
    return rows;
  }
  const workerBalances = workerOwed();

  // ------------------------------------------------ Jobs: contract, invoiced, received, planned vs actual cost, profit
  const jobs = x.jobs.map(j => {
    const costs = accounts.filter(m => m.dir === "OUT" && m.quoteId === j.quoteId && category(m.categoryKey).group !== "NOT_PL");
    const byGroup = (keys: string[]) => sum(costs.filter(m => keys.includes(m.categoryKey)), valueOf);
    const materials = byGroup(["MATERIALS"]), labour = byGroup(["LABOUR", "SUBCONTRACTOR"]), other = r2(sum(costs, valueOf) - materials - labour);
    const actualCost = r2(materials + labour + other);
    const invoices = x.invoices.filter(i => i.quoteId === j.quoteId);
    const invoiced = sum(invoices, i => i.gross), invoicedNet = sum(invoices, i => i.net);
    const received = sum(x.payments.filter(p => p.quoteId === j.quoteId && p.status === "CONFIRMED"), p => p.amount);
    const reported = sum(x.payments.filter(p => p.quoteId === j.quoteId && p.status === "REPORTED"), p => p.amount);
    const v = j.vatPercent || 0, receivedNet = r2(received / (1 + v / 100));
    const committed = x.jobCosts.filter(c => c.quoteId === j.quoteId && c.status === "OPEN");
    const stillToPay = sum(committed, c => Math.max(0, c.amount - c.paid));
    // Labour owed from days on site × rate (day workers) and agreed prices (price workers), less what they've been paid.
    const labourOwed = r2(workerBalances.filter(w => w.quoteId === j.quoteId).reduce((a, w) => a + Math.max(0, w.owed - w.paid), 0));
    const incomeNet = invoicedNet > 0 ? invoicedNet : receivedNet;
    const forecastCost = r2(Math.max(j.plannedCost, actualCost + stillToPay + labourOwed));
    return {
      ...j, invoiced, received, reported, outstanding: r2(Math.max(0, (invoiced || j.contractGross) - received)) , toInvoice: r2(Math.max(0, j.contractGross - invoiced)),
      materials, labour, other, actualCost, committed: sum(committed, c => c.amount), stillToPay, labourOwed,
      profitSoFar: r2(incomeNet - actualCost), plannedProfit: r2(j.contractNet - j.plannedCost), forecastProfit: r2(j.contractNet - forecastCost),
      costVsPlan: j.plannedCost ? r2(actualCost / j.plannedCost * 100) : 0,
      jobCosts: x.jobCosts.filter(c => c.quoteId === j.quoteId),
    };
  });


  // ------------------------------------------------ Workers & CIS
  const taxYearStart = (() => { const y = Number(today.slice(0, 4)); const d = `${y}-04-06`; return today >= d ? d : `${y - 1}-04-06`; })();
  const workers = x.workers.map(w => {
    const rows = workerBalances.filter(b => b.workerId === w.id);
    const pays = x.entries.filter(e => e.direction === "OUT" && e.workerId === w.id);
    const oldPays = x.expenses.filter(e => e.workerId === w.id);
    const owed = sum(rows, r => r.owed), paidAll = r2(sum(pays, e => e.amount) + sum(oldPays, e => e.amount));
    const unallocated = r2(sum(pays.filter(e => !e.quoteId), e => e.amount) + sum(oldPays.filter(e => !e.quoteId), e => e.amount));
    return {
      ...w, jobs: rows.map(r => ({ ...r, reference: jobRef.get(r.quoteId)?.reference ?? "—" })), days: rows.reduce((a, r) => a + r.days, 0), owed, paid: paidAll,
      balance: r2(owed - paidAll), unallocated,
      cisDeductedYear: sum(pays.filter(e => e.date >= taxYearStart), e => e.cisDeducted),
      paidYear: r2(sum(pays.filter(e => e.date >= taxYearStart), e => e.amount) + sum(oldPays.filter(e => e.spentOn >= taxYearStart), e => e.amount)),
      cisMissing: (w.cisStatus === "NET20" || w.cisStatus === "NET30") ? oldPays.filter(e => e.spentOn >= taxYearStart).length + pays.filter(e => e.date >= taxYearStart && e.method !== "CASH" && !e.cisLabour).length : 0,
      cashPaid: r2(sum(pays.filter(e => e.method === "CASH"), e => e.amount) + sum(oldPays.filter(e => e.method === "CASH"), e => e.amount)),
    };
  });
  // CIS monthly returns for this tax year (6 Apr – 5 Apr), up to the current tax month.
  const cisMonths: { key: string; label: string; start: Day; end: Day; returnDue: Day; paymentDue: Day; subs: { workerId: string; name: string; utr: string; status: CisStatus; gross: number; materials: number; deducted: number }[]; deducted: number; gross: number; nil: boolean; status: "OPEN" | "DUE" | "OVERDUE" | "PAST" }[] = [];
  if (s.cisContractor) {
    for (let m = cisMonth(taxYearStart); m.start <= today; m = cisMonth(addDays(m.end, 1))) {
      const pays = x.entries.filter(e => e.direction === "OUT" && e.workerId && within(e.date, m.start, m.end) && (e.cisLabour > 0 || e.cisMaterials > 0 || e.cisDeducted > 0 || ["GROSS", "NET20", "NET30"].includes(workerById.get(e.workerId)?.cisStatus ?? "NONE")));
      const by = new Map<string, { gross: number; materials: number; deducted: number }>();
      for (const e of pays) { const b = by.get(e.workerId!) ?? { gross: 0, materials: 0, deducted: 0 }; b.gross += e.cisLabour + e.cisMaterials || netOf(e.amount, e.vat, e.vatTreatment); b.materials += e.cisMaterials; b.deducted += e.cisDeducted; by.set(e.workerId!, b); }
      const subs = [...by.entries()].map(([workerId, b]) => { const w = workerById.get(workerId); return { workerId, name: w?.name ?? "—", utr: w?.utr ?? "", status: (w?.cisStatus ?? "NONE") as CisStatus, gross: r2(b.gross), materials: r2(b.materials), deducted: r2(b.deducted) }; });
      cisMonths.push({ key: m.key, label: m.label, start: m.start, end: m.end, returnDue: m.returnDue, paymentDue: m.paymentDue, subs, deducted: sum(subs, z => z.deducted), gross: sum(subs, z => z.gross), nil: !subs.length,
        status: today <= m.end ? "OPEN" : today <= m.returnDue ? "DUE" : daysBetween(m.returnDue, today) <= 45 ? "OVERDUE" : "PAST" });
    }
  }
  const cisSuffered = sum(x.entries.filter(e => e.direction === "IN" && e.date >= taxYearStart), e => e.cisDeducted);

  // ------------------------------------------------ Company running costs: expected (repeating) vs actual
  const yearStart = `${today.slice(0, 4)}-01-01`, monthStart = `${monthKey(today)}-01`, monthEnd = addDays(addMonths(monthStart, 1), -1);
  const recurring = x.recurring.map(r => {
    const next = occurrences(r, today, addMonths(today, 13))[0] ?? null;
    const thisYear = occurrences(r, yearStart, `${today.slice(0, 4)}-12-31`);
    const paid = x.entries.filter(e => e.recurringId === r.id);
    return { ...r, next, perMonth: r.active ? monthlyEquivalent(r.amount, r.frequency) : 0, expectedYear: r2(thisYear.length * r.amount), paidYear: sum(paid.filter(e => e.date >= yearStart), e => e.amount),
      lastPaid: paid.map(e => e.date).sort().pop() ?? null, dueSoon: !!(r.active && next && daysBetween(today, next) <= 14) };
  });
  const overheadMoves = accounts.filter(m => m.dir === "OUT" && !m.quoteId && ["OVERHEAD", "NOT_DEDUCTIBLE"].includes(category(m.categoryKey).group));
  const company = {
    recurring, perMonth: sum(recurring, r => r.perMonth),
    thisMonth: { expected: sum(x.recurring.filter(r => r.active), r => occurrences(r, monthStart, monthEnd).length * r.amount), actual: sum(overheadMoves.filter(m => within(m.date, monthStart, monthEnd)), m => m.amount) },
    thisYear: { expected: sum(recurring, r => r.expectedYear), actual: sum(overheadMoves.filter(m => m.date >= yearStart), m => m.amount) },
    byCategory: [...new Set(overheadMoves.filter(m => m.date >= yearStart).map(m => m.categoryKey))].map(k => ({ key: k, label: category(k).label, amount: sum(overheadMoves.filter(m => m.date >= yearStart && m.categoryKey === k), m => m.amount) })).sort((a, b) => b.amount - a.amount),
    upcoming: recurring.filter(r => r.active && r.next && daysBetween(today, r.next) <= 31).sort((a, b) => (a.next! < b.next! ? -1 : 1)),
  };

  // ------------------------------------------------ Cash box
  const cashMoves = cash.filter(m => m.method === "CASH");
  const withdrawn = x.entries.filter(e => e.category === "CASH_WITHDRAWAL"), banked = x.entries.filter(e => e.category === "CASH_DEPOSIT");
  const cashBook = {
    in: sum(cashMoves.filter(m => m.dir === "IN"), paidOf), out: sum(cashMoves.filter(m => m.dir === "OUT"), paidOf),
    withdrawn: sum(withdrawn, e => e.amount), banked: sum(banked, e => e.amount),
    balance: 0, lines: [] as { date: Day; label: string; dir: "IN" | "OUT"; amount: number; categoryKey: string; quoteId: string | null; source: string; id: string; running: number }[],
  };
  const cashLines = [
    ...cashMoves.map(m => ({ date: m.date, label: m.label, dir: m.dir, amount: paidOf(m), categoryKey: m.categoryKey, quoteId: m.quoteId, source: m.source, id: m.id })),
    ...withdrawn.map(e => ({ date: e.date, label: "Cash from the bank", dir: "IN" as const, amount: e.amount, categoryKey: e.category, quoteId: null, source: "ENTRY", id: e.id })),
    ...banked.map(e => ({ date: e.date, label: "Cash paid into the bank", dir: "OUT" as const, amount: e.amount, categoryKey: e.category, quoteId: null, source: "ENTRY", id: e.id })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let run = 0;
  cashBook.lines = cashLines.map(l => { run = r2(run + (l.dir === "IN" ? l.amount : -l.amount)); return { ...l, running: run }; }).reverse();
  cashBook.balance = run;

  // ------------------------------------------------ VAT returns
  // VAT cash accounting: sales count when the client pays, costs when we pay (invoices raised but unpaid don't count yet).
  // Standard accounting: sales on the invoice date, costs on the receipt date.
  const vatBasis = s.vatScheme === "CASH" ? cash : accounts;
  const vat = vatPeriods(s, today).map(p => {
    const lines = vatBasis.filter(m => within(m.date, p.start, p.end));
    const ret = vatReturn(lines.map(toVat));
    const paid = sum(cash.filter(m => m.categoryKey === "HMRC_VAT" && within(m.date, p.end, addDays(p.due, 45))), paidOf);
    const refund = sum(cash.filter(m => m.categoryKey === "HMRC_REFUND" && within(m.date, p.end, addDays(p.due, 90))), paidOf);
    const status = today <= p.end ? "OPEN" : ret.box5 <= 0 ? (refund > 0 ? "REFUNDED" : "CLAIM") : paid >= ret.box5 - 0.01 ? "PAID" : today <= p.due ? "DUE" : "OVERDUE";
    return { ...p, ...ret, paid, status, sales: lines.filter(m => m.dir === "IN").length, purchases: lines.filter(m => m.dir === "OUT").length };
  }).reverse();
  const missingVat = x.expenses.filter(e => !e.vat && e.vatTreatment === "OUTSIDE" && ["MATERIALS", "PLANT", "SKIPS", "JOB_FEES", "FEES", "OTHER", "JOB_OTHER"].includes(e.category)).length;

  // ------------------------------------------------ Year end (accounting periods), Corporation Tax
  const years = accountsPeriods(s, today).map(p => {
    const lines = accounts.filter(m => within(m.date, p.start, p.end));
    const pl = profitAndLoss(lines.map(toPnl), reg);
    const days = daysBetween(p.start, p.end) + 1;
    const taxes = p.taxPeriods.map(tp => {
      const share = (daysBetween(tp.start, tp.end) + 1) / days;
      const ct = corporationTax(pl.taxableProfit * share, tp.start, tp.end, s.associatedCompanies);
      return { ...tp, profit: r2(pl.taxableProfit * share), tax: ct.tax, parts: ct.parts, paymentDue: addDays(addMonths(tp.end, 9), 1) };
    });
    const ct = sum(taxes, t => t.tax);
    const ctPaid = sum(cash.filter(m => m.categoryKey === "HMRC_CT" && m.date > p.start), paidOf);
    return { ...p, pl, taxes, ct, ctAfterCis: r2(Math.max(0, ct - sum(x.entries.filter(e => e.direction === "IN" && within(e.date, p.start, p.end)), e => e.cisDeducted))),
      ctPaid, profitAfterTax: r2(pl.netProfit - ct), current: within(today, p.start, p.end), monthsDone: Math.min(12, Math.max(0, Math.round(daysBetween(p.start, today < p.end ? today : p.end) / 30.44))) };
  }).reverse();

  // ------------------------------------------------ Bank reconciliation: "on paper" vs the bank
  const lastBankDate = x.bank.lastDate;
  const notInBank = [...cash.filter(m => m.method === "BANK" && !m.inBank && lastBankDate && m.date <= lastBankDate && m.source !== "INVOICE")]
    .sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 200)
    .map(m => ({ id: m.id, source: m.source, date: m.date, dir: m.dir, amount: paidOf(m), label: m.label, categoryKey: m.categoryKey, reference: m.quoteId ? jobRef.get(m.quoteId)?.reference ?? "" : "" }));

  // ------------------------------------------------ Headlines
  const cur = years.find(y => y.current) ?? years[0] ?? null;
  const vatNow = vat.find(v => v.status === "OPEN") ?? null;
  const vatDue = vat.filter(v => v.status === "DUE" || v.status === "OVERDUE");
  const cisDue = cisMonths.filter(m => m.status === "DUE" || m.status === "OVERDUE");
  const owedByClients = r2(jobs.reduce((a, j) => a + Math.max(0, j.invoiced - j.received), 0));
  const owedToWorkers = r2(workers.reduce((a, w) => a + Math.max(0, w.balance), 0) + jobs.reduce((a, j) => a + j.stillToPay, 0));
  const alerts: { level: "urgent" | "warn" | "info"; text: string; tab: string }[] = [];
  for (const v of vatDue) alerts.push({ level: v.status === "OVERDUE" ? "urgent" : "warn", text: `VAT return ${v.label}: £${v.box5.toFixed(2)} ${v.box5 >= 0 ? "to pay" : "to reclaim"} – due ${v.due}`, tab: "vat" });
  for (const m of cisDue) alerts.push({ level: m.status === "OVERDUE" ? "urgent" : "warn", text: `CIS return ${m.label}${m.nil ? " (nil return)" : `: £${m.deducted.toFixed(2)} to pay`} – file by ${m.returnDue}`, tab: "workers" });
  if (x.bank.toDo) alerts.push({ level: "info", text: `${x.bank.toDo} bank line${x.bank.toDo === 1 ? "" : "s"} to sort`, tab: "bank" });
  if (missingVat) alerts.push({ level: "info", text: `${missingVat} job expense${missingVat === 1 ? "" : "s"} have no VAT entered – add it so you can reclaim it`, tab: "jobs" });
  const cisMissing = workers.reduce((a, w) => a + w.cisMissing, 0);
  if (cisMissing) alerts.push({ level: "warn", text: `${cisMissing} payment${cisMissing === 1 ? "" : "s"} to CIS subcontractors have no CIS breakdown – record pay in Workers & CIS`, tab: "workers" });
  for (const r of company.upcoming.filter(r => r.dueSoon)) alerts.push({ level: "info", text: `${r.name}: £${r.amount.toFixed(2)} due ${r.next}`, tab: "company" });
  if (!s.incorporationDate || (s.vatRegistered && (!s.vatRegistrationDate || !s.vatFirstPeriodEnd))) alerts.unshift({ level: "warn", text: "Enter your company and VAT dates once in Settings so VAT and year-end can be worked out", tab: "settings" });

  return {
    today, settings: s, months, jobs, workers, cisMonths, cisSuffered, company, cashBook, vat, years, notInBank,
    headline: {
      year: cur ? { label: cur.label, turnover: cur.pl.turnover, grossProfit: cur.pl.grossProfit, netProfit: cur.pl.netProfit, ct: cur.ct, monthsDone: cur.monthsDone, end: cur.end } : null,
      vatNow: vatNow ? { label: vatNow.label, box5: vatNow.box5, due: vatNow.due, end: vatNow.end } : null,
      owedByClients, owedToWorkers, cashBox: cashBook.balance, bankBalance: x.bank.lastClosing, bankDate: x.bank.lastDate, bankToDo: x.bank.toDo,
      thisMonth: months[months.length - 1],
    },
    alerts,
  };
}
export type FinanceReport = ReturnType<typeof buildReport>;
