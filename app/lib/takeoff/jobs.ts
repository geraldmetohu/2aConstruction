// Pure job calculations: progress, payments due, days worked and pay owed, material orders to place,
// client supplies due and the to-do list. No database access, so the same code runs in tests.

import type { CustomerTakeoff } from "./engine";
import type { ProgrammeRow } from "./documents";
import type { AssignmentRow, CheckInRow, ExpenseRow, OrderRow, PaymentRow, StageRow, SupplyRow } from "./jobs-store";
import type { PaymentRow as ScheduleRow } from "./documents";
import type { TakeoffLine } from "./types";

const r2 = (x: number) => Math.round(x * 100) / 100;
export const londonDay = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000);

/** Stable key for a client-supplied item. */
export const supplyKey = (o: { area: string; description: string }) => `${o.area}|${o.description}`.slice(0, 300);

// ---------------------------------------------------------------- Progress

export interface StageProgress { stage: string; label: string; days: number; start?: string; end?: string; status: StageRow["status"]; percent: number; note: string; late: boolean }

export function stageProgress(rows: ProgrammeRow[], saved: StageRow[], today: string): { stages: StageProgress[]; percent: number; current?: StageProgress; behind: number } {
  const byStage = new Map(saved.map(s => [s.stage, s]));
  const stages = rows.filter(r => r.days > 0).map(r => {
    const s = byStage.get(r.stage);
    const status = s?.status ?? "NOT_STARTED", percent = s?.percent ?? 0;
    return { stage: r.stage, label: r.label, days: r.days, start: r.start, end: r.end, status, percent, note: s?.note ?? "", late: !!r.end && r.end < today && status !== "DONE" };
  });
  const total = stages.reduce((s, x) => s + x.days, 0) || 1;
  const percent = Math.round(stages.reduce((s, x) => s + x.days * x.percent, 0) / total);
  return { stages, percent, current: stages.find(s => s.status === "IN_PROGRESS") ?? stages.find(s => s.status === "NOT_STARTED"), behind: stages.filter(s => s.late).length };
}

// ---------------------------------------------------------------- Client payments

export interface DueRow extends ScheduleRow { paid: number; balance: number; state: "PAID" | "PART_PAID" | "DUE" | "OVERDUE" | "UPCOMING" }

/** Confirmed payments are applied to the schedule in order. */
export function paymentsDue(schedule: ScheduleRow[], payments: PaymentRow[], today: string, soonDays = 7) {
  let pot = payments.filter(p => p.status === "CONFIRMED").reduce((s, p) => s + p.amount, 0);
  const received = r2(pot);
  const rows: DueRow[] = schedule.map(s => {
    const paid = r2(Math.min(s.amount, pot)); pot = r2(pot - paid);
    const balance = r2(s.amount - paid);
    const state: DueRow["state"] = balance <= 0.005 ? "PAID" : !s.date ? (paid > 0 ? "PART_PAID" : "UPCOMING")
      : s.date < today ? "OVERDUE" : daysBetween(today, s.date) <= soonDays ? (paid > 0 ? "PART_PAID" : "DUE") : paid > 0 ? "PART_PAID" : "UPCOMING";
    return { ...s, paid, balance, state };
  });
  const total = r2(schedule.reduce((s, x) => s + x.amount, 0));
  return { rows, received, outstanding: r2(total - received), next: rows.find(r => r.balance > 0), reported: r2(payments.filter(p => p.status === "REPORTED").reduce((s, p) => s + p.amount, 0)) };
}

// ---------------------------------------------------------------- Days worked & pay

export interface DayWorked { date: string; in?: string; out?: string; hours?: number; value: number; missingOut: boolean }

/** A day with check-in and check-out: ≥ 6 h = 1 day, otherwise ½ day. Check-in without check-out counts as a day (flagged). */
export function daysWorked(checkIns: CheckInRow[]): DayWorked[] {
  const byDate = new Map<string, CheckInRow[]>();
  for (const c of checkIns) { const d = londonDay(c.at); byDate.set(d, [...(byDate.get(d) ?? []), c]); }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => {
    const ins = list.filter(c => c.kind === "IN").map(c => new Date(c.at).getTime()), outs = list.filter(c => c.kind === "OUT").map(c => new Date(c.at).getTime());
    const first = ins.length ? Math.min(...ins) : undefined, last = outs.length ? Math.max(...outs) : undefined;
    const t = (x?: number) => (x ? new Date(x).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : undefined);
    if (first && last && last > first) { const hours = r2((last - first) / 3600000); return { date, in: t(first), out: t(last), hours, value: hours >= 6 ? 1 : 0.5, missingOut: false }; }
    return { date, in: t(first), out: t(last), value: first ? 1 : 0, missingOut: !!first && !last };
  }).filter(d => d.value > 0);
}

export interface PayOwed { workerId: string; quoteId: string; basis: "DAY" | "JOB"; days: number; rate: number | null; earned: number; paid: number; balance: number; missingOut: number }

export function payOwed(a: AssignmentRow, checkIns: CheckInRow[], expenses: ExpenseRow[], workerDayRate: number | null): PayOwed {
  const mine = checkIns.filter(c => c.workerId === a.workerId && c.quoteId === a.quoteId);
  const days = daysWorked(mine);
  const dayCount = days.reduce((s, d) => s + d.value, 0);
  const rate = a.dayRate ?? workerDayRate;
  const earned = a.payBasis === "JOB" ? a.agreedPrice ?? 0 : r2(dayCount * (rate ?? 0));
  const paid = r2(expenses.filter(e => !e.void && e.workerId === a.workerId && e.quoteId === a.quoteId).reduce((s, e) => s + e.amount, 0));
  return { workerId: a.workerId, quoteId: a.quoteId, basis: a.payBasis, days: dayCount, rate, earned: r2(earned), paid, balance: r2(earned - paid), missingOut: days.filter(d => d.missingOut).length };
}

// ---------------------------------------------------------------- Material orders & client supplies

export interface OrderNeed { stage: string; label: string; start: string; daysAway: number; items: { description: string; quantity: number; unit: string }[]; ordered?: OrderRow }

/** Our materials for stages starting within `lookAhead` working days that are not yet ordered. */
export function ordersToPlace(lines: TakeoffLine[], rows: ProgrammeRow[], orders: OrderRow[], today: string, lookAhead = 3): OrderNeed[] {
  const out: OrderNeed[] = [];
  for (const r of rows) {
    if (!r.start || r.days <= 0) continue;
    const away = daysBetween(today, r.start);
    if (away < 0 || away > lookAhead + 2) continue; // +2 calendar days covers a weekend
    const items = new Map<string, { description: string; quantity: number; unit: string }>();
    for (const l of lines) if (l.stage === r.stage && (l.kind === "MATERIAL" || l.kind === "SUPPORTING") && !l.excluded && !l.clientSupplied) {
      const k = `${l.description}|${l.unit}`, x = items.get(k);
      items.set(k, x ? { ...x, quantity: r2(x.quantity + l.quantity) } : { description: l.description, quantity: l.quantity, unit: l.unit });
    }
    if (!items.size) continue;
    out.push({ stage: r.stage, label: r.label, start: r.start, daysAway: away, items: [...items.values()], ordered: orders.find(o => o.stage === r.stage) });
  }
  return out;
}

export interface SupplyNeed { key: string; area: string; item: string; quantity: number; unit: string; spec: string; neededBy?: string; status: SupplyRow["status"]; daysLeft?: number }

export function clientSupplies(c: CustomerTakeoff, rows: ProgrammeRow[], saved: SupplyRow[], today: string): SupplyNeed[] {
  const start = new Map(rows.map(r => [r.stage, r.start]));
  const byKey = new Map(saved.map(s => [s.itemKey, s]));
  return c.clientOrders.map(o => {
    const key = supplyKey(o), s = byKey.get(key);
    const stageStart = o.stage ? start.get(o.stage) : undefined;
    const neededBy = stageStart ? shift(stageStart, -3) : undefined;
    return { key, area: o.area, item: o.description, quantity: o.quantity, unit: o.unit, spec: o.spec ?? "", neededBy, status: s?.status ?? "TO_ORDER", daysLeft: neededBy ? daysBetween(today, neededBy) : undefined };
  });
}
const shift = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

// ---------------------------------------------------------------- To-do list

export interface Todo { level: "urgent" | "soon" | "info"; kind: string; text: string; href: string; quoteId?: string }
export const todoOrder = (a: Todo, b: Todo) => ["urgent", "soon", "info"].indexOf(a.level) - ["urgent", "soon", "info"].indexOf(b.level);

// ---------------------------------------------------------------- Stage invoices

/**
 * Which payment-schedule rows should have an invoice by now. An invoice is raised once and never changes:
 * deposit and approved variations straight away; a stage payment when all of its stages are marked done
 * (or, for schedules without stage links, on its planned date); the final payment when the job is completed.
 */
export function invoicesDue(schedule: ScheduleRow[], stages: StageProgress[], jobStatus: string, today: string, already: Set<number>): ScheduleRow[] {
  const done = new Set(stages.filter(s => s.status === "DONE").map(s => s.stage)), known = new Set(stages.map(s => s.stage));
  return schedule.filter(r => {
    if (already.has(r.n) || !(r.amount > 0)) return false;
    const kind = r.kind ?? (/^Deposit/.test(r.label) ? "DEPOSIT" : /^Final/.test(r.label) ? "FINAL" : /^Variation/.test(r.label) ? "VARIATION" : "STAGE");
    if (kind === "DEPOSIT" || kind === "VARIATION") return true;
    if (kind === "FINAL") return jobStatus === "COMPLETED";
    const mine = (r.stages ?? []).filter(s => known.has(s));
    if (mine.length) return mine.every(s => done.has(s));
    return !!r.date && r.date <= today;
  });
}

/** Invoice amounts: gross from the schedule, VAT split in proportion to the contract (handles mixed VAT rates). */
export function invoiceAmounts(row: ScheduleRow, contract: { net: number; gross: number }) {
  const gross = r2(row.amount);
  const net = row.net !== undefined ? r2(row.net) : contract.gross > 0 ? r2(gross * contract.net / contract.gross) : gross;
  return { net, vat: r2(gross - net), gross };
}

export const invoiceNumber = (reference: string, n: number) => `${reference}-INV${String(n).padStart(2, "0")}`;
export const addDaysIso = (d: string, n: number) => shift(d, n);
