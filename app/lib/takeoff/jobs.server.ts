import "server-only";
import { prisma } from "@/app/lib/db";
import type { CustomerTakeoff } from "./engine";
import { buildDocuments, type QuoteDocs } from "./documents";
import { companyProfile } from "./prices.server";
import { takeoffInputSchema, type TakeoffInput } from "./schema";
import { getQuote, getVersion, prismaDb, storageReady, type QuoteRow } from "./store";
import type { TakeoffResult } from "./types";
import {
  getJob, jobsReady, listActions, listAssignments, listCheckIns, listEvents, listExpenses, listJobs, listOrders, listPayments, listPhotos, listStages,
  listSupplies, listWorkers, monthlyMoney, unreadSince,
} from "./jobs-store";
import { listDocuments } from "./job-documents";
import { clientSupplies, londonDay, ordersToPlace, paymentsDue, payOwed, stageProgress, todoOrder, type Todo } from "./jobs";

export const db = () => prismaDb(prisma);
export async function jobsAvailable() { const d = db(); return (await storageReady(d)) && (await jobsReady(d)); }

/** Everything about one job, from the version the client accepted (or the latest one sent). */
export async function loadJob(quoteId: string, opts: { forClient?: boolean } = {}) {
  const d = db();
  const q = await getQuote(d, quoteId);
  if (!q) return null;
  const versionNo = q.quote.publishedVersion ?? q.quote.currentVersion;
  const version = await getVersion(d, quoteId, versionNo);
  if (!version) return null;
  const job = await getJob(d, quoteId);
  const parsed = takeoffInputSchema.parse(version.input);
  const input: TakeoffInput = { ...parsed, terms: { ...parsed.terms, startDate: job.startDate ?? parsed.terms.startDate } };
  const customer = version.customer as CustomerTakeoff;
  const { company } = await companyProfile();
  const today = londonDay(new Date());
  const docs: QuoteDocs = buildDocuments({ customer, input, company, client: { name: q.quote.clientName, email: q.quote.clientEmail, siteAddress: q.quote.siteAddress },
    reference: q.quote.reference, version: versionNo, issueDate: londonDay(version.createdAt) });
  const [stagesSaved, events, photos, actions, supplies, payments, documents] = await Promise.all([
    listStages(d, quoteId), listEvents(d, quoteId, opts.forClient), listPhotos(d, quoteId, opts.forClient), listActions(d, quoteId), listSupplies(d, quoteId), listPayments(d, quoteId),
    listDocuments(d, quoteId, opts.forClient).catch(() => []),
  ]);
  const progress = stageProgress(docs.programme, stagesSaved, today);
  const money = paymentsDue(docs.payments, payments, today);
  const supplyList = clientSupplies(customer, docs.programme, supplies, today);
  const base = { quote: q.quote, versionNo, job, input, customer, company, docs, today, progress, events, photos, documents, actions, payments, money, supplies: supplyList };
  if (opts.forClient) return { ...base, admin: null };
  const result = version.result as TakeoffResult;
  const [orders, expenses, assignments, checkIns, workers, unread] = await Promise.all([
    listOrders(d, quoteId), listExpenses(d, { quoteId }), listAssignments(d, { quoteId }), listCheckIns(d, { quoteId }), listWorkers(d), unreadSince(d, quoteId, "ADMIN"),
  ]);
  const team = assignments.map(a => ({ assignment: a, worker: workers.find(w => w.id === a.workerId)!, owed: payOwed(a, checkIns, expenses, workers.find(w => w.id === a.workerId)?.dayRate ?? null) }));
  const spent = expenses.filter(e => !e.void).reduce((s, e) => s + e.amount, 0);
  return {
    ...base,
    admin: {
      result, orders, expenses, team, checkIns, workers, unread,
      toOrder: ordersToPlace(result.lines, docs.programme, orders, today, 5),
      // Planned cost is the quote's direct cost; actual is what has been spent so far.
      finance: { contract: customer.gross, net: customer.net, plannedCost: result.totals.costSubtotal, spent, received: money.received, profitSoFar: money.received / (1 + input.commercial.vatPercent / 100) - spent },
    },
  };
}
export type LoadedJob = NonNullable<Awaited<ReturnType<typeof loadJob>>>;

/** The activity panel: what needs doing today, and how the company is doing. */
export async function companyOverview() {
  const d = db();
  const today = londonDay(new Date());
  const [jobs, months, workers, allExpenses, allCheckIns] = await Promise.all([listJobs(d), monthlyMoney(d, 12), listWorkers(d), listExpenses(d), listCheckIns(d, { sinceDays: 120 })]);
  const todos: Todo[] = [];
  const orders: { quoteId: string; reference: string; label: string; start: string; items: number }[] = [];
  let outstanding = 0, overdue = 0, dueSoon = 0, contractActive = 0;
  const active = jobs.filter(j => j.status !== "COMPLETED");
  for (const j of active) {
    const loaded = await loadJob(j.quoteId);
    if (!loaded?.admin) continue;
    const href = `/dashboard/jobs/${j.quoteId}`, ref = `${j.reference} ${j.clientName}`;
    contractActive += loaded.customer.gross;
    outstanding += loaded.money.outstanding;
    for (const r of loaded.money.rows) {
      if (r.state === "OVERDUE") { overdue += r.balance; todos.push({ level: "urgent", kind: "payment", text: `${ref}: ${r.label} £${r.balance.toFixed(2)} overdue since ${r.date}`, href, quoteId: j.quoteId }); }
      else if (r.state === "DUE") { dueSoon += r.balance; todos.push({ level: "soon", kind: "payment", text: `${ref}: ${r.label} £${r.balance.toFixed(2)} due ${r.date}`, href, quoteId: j.quoteId }); }
    }
    if (loaded.money.reported > 0) todos.push({ level: "urgent", kind: "payment", text: `${ref}: client reports £${loaded.money.reported.toFixed(2)} paid – check the bank and confirm`, href, quoteId: j.quoteId });
    if (loaded.admin.unread > 0) todos.push({ level: "urgent", kind: "message", text: `${ref}: ${loaded.admin.unread} new from the client`, href, quoteId: j.quoteId });
    for (const o of loaded.admin.toOrder) if (!o.ordered) {
      todos.push({ level: o.daysAway <= 1 ? "urgent" : "soon", kind: "order", text: `${ref}: order ${o.items.length} materials for ${o.label} (starts ${o.start})`, href: `${href}?tab=orders`, quoteId: j.quoteId });
      orders.push({ quoteId: j.quoteId, reference: j.reference, label: o.label, start: o.start, items: o.items.length });
    }
    for (const s of loaded.supplies) if (s.status !== "DELIVERED" && s.daysLeft !== undefined && s.daysLeft <= 5)
      todos.push({ level: s.daysLeft < 0 ? "urgent" : "soon", kind: "supply", text: `${ref}: client to ${s.status === "TO_ORDER" ? "order" : "deliver"} ${s.item} by ${s.neededBy}`, href: `${href}?tab=client`, quoteId: j.quoteId });
    for (const a of loaded.actions) if (a.status === "ANSWERED") todos.push({ level: "soon", kind: "answer", text: `${ref}: client answered “${a.title}”`, href: `${href}?tab=client`, quoteId: j.quoteId });
    if (loaded.progress.behind > 0) todos.push({ level: "soon", kind: "programme", text: `${ref}: ${loaded.progress.behind} stage${loaded.progress.behind > 1 ? "s" : ""} behind programme`, href, quoteId: j.quoteId });
    if (j.status === "IN_PROGRESS" && loaded.admin.team.some(t => t.assignment.active) && !loaded.admin.checkIns.some(c => londonDay(c.at) === today))
      todos.push({ level: "info", kind: "team", text: `${ref}: nobody has checked in today`, href: `${href}?tab=team`, quoteId: j.quoteId });
    for (const t of loaded.admin.team) if (t.owed.balance > 0.5) todos.push({ level: "info", kind: "pay", text: `${ref}: ${t.worker?.name} is owed £${t.owed.balance.toFixed(2)}`, href: `${href}?tab=team`, quoteId: j.quoteId });
    if (!loaded.job.startDate && !loaded.input.terms.startDate) todos.push({ level: "info", kind: "start", text: `${ref}: set the start date`, href, quoteId: j.quoteId });
  }
  const sum = (k: "moneyIn" | "moneyOut") => months.reduce((s, m) => s + m[k], 0);
  const thisMonth = months[months.length - 1] ?? { moneyIn: 0, moneyOut: 0 };
  const owedToTeam = workers.length ? (await Promise.all(active.map(async j => (await listAssignments(d, { quoteId: j.quoteId })).map(a => payOwed(a, allCheckIns, allExpenses, workers.find(w => w.id === a.workerId)?.dayRate ?? null).balance))))
    .flat().filter(b => b > 0).reduce((s, b) => s + b, 0) : 0;
  return {
    today, todos: todos.sort(todoOrder), orders, jobs,
    finance: {
      months: months.map(m => ({ ...m, profit: Math.round((m.moneyIn / 1.2 - m.moneyOut) * 100) / 100 })),
      turnover12: sum("moneyIn"), out12: sum("moneyOut"), thisMonthIn: thisMonth.moneyIn, thisMonthOut: thisMonth.moneyOut,
      outstanding, overdue, dueSoon, contractActive, owedToTeam, activeJobs: active.length,
    },
  };
}

export type QuoteLite = QuoteRow;
