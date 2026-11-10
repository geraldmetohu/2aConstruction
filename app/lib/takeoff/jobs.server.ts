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
import { approvedVariations } from "./variations";
import { addDaysIso, clientSupplies, invoiceAmounts, invoiceNumber, invoicesDue, londonDay, ordersToPlace, paymentsDue, payOwed, stageProgress, todoOrder, type Todo } from "./jobs";
import { getPortalInfo, issueInvoice, listInvoices, listSnags, markInvoiceEmailed, portalReady, type InvoiceRow, type PortalInfo, type SnagRow } from "./portal-store";
import { emailInvoice } from "./quote-mail.server";
import { renderInvoicePdf } from "./invoice-pdf.server";

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
  // Approved variations are added to the payment schedule (payable with the next stage payment).
  const variations = approvedVariations(actions);
  const schedule = [...docs.payments, ...variations.list.map((v, i) => ({ n: docs.payments.length + i + 1, label: `Variation: ${v.action.title}`,
    when: "Approved by you – payable with the next stage payment", percent: 0, amount: v.price.gross, net: v.price.net, kind: "VARIATION" as const }))];
  const money = paymentsDue(schedule, payments, today);
  // Client portal: project manager, requested start, stage invoices (raised automatically) and snags.
  const portalOn = await portalReady(d);
  let portal: PortalInfo = { requestedStart: null, managerName: "", managerPhone: "", managerEmail: "" }, invoices: InvoiceRow[] = [], snags: SnagRow[] = [];
  if (portalOn) {
    [portal, invoices, snags] = await Promise.all([getPortalInfo(d, quoteId), listInvoices(d, quoteId), listSnags(d, quoteId)]);
    if (q.quote.status === "ACCEPTED") {
      const fresh = await syncInvoices(quoteId, q.quote, schedule, progress, job.status, docs, today, invoices);
      if (fresh.length) invoices = await listInvoices(d, quoteId);
    }
  }
  const supplyList = clientSupplies(customer, docs.programme, supplies, today);
  const base = { quote: q.quote, versionNo, job, input, customer, company, docs, today, progress, events, photos, documents, actions, payments, money, supplies: supplyList, portalOn, portal, invoices, snags, schedule,
    variations: { net: variations.net, gross: variations.gross, count: variations.list.length } };
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
      finance: { contract: customer.gross + variations.gross, net: customer.net + variations.net, plannedCost: result.totals.costSubtotal, spent, received: money.received, profitSoFar: money.received / (1 + input.commercial.vatPercent / 100) - spent },
    },
  };
}
export type LoadedJob = NonNullable<Awaited<ReturnType<typeof loadJob>>>;

/** Raise the invoices that have fallen due and email each new one to the client once. */
async function syncInvoices(quoteId: string, q: QuoteRow, schedule: QuoteDocs["payments"], progress: ReturnType<typeof stageProgress>, status: string, docs: QuoteDocs, today: string, existing: InvoiceRow[]) {
  const d = db();
  const due = invoicesDue(schedule, progress.stages, status, today, new Set(existing.map(i => i.scheduleNo)));
  const created: InvoiceRow[] = [];
  for (const r of due) {
    const a = invoiceAmounts(r, { net: docs.price.net, gross: docs.price.gross });
    const inv = await issueInvoice(d, quoteId, { scheduleNo: r.n, number: invoiceNumber(q.reference, r.n), label: r.label, description: r.when, issuedOn: today, dueOn: addDaysIso(today, docs.paymentDays || 7), ...a }, "system").catch(e => { console.error("[invoices]", e); return null; });
    if (!inv) continue;
    created.push(inv);
    await sendInvoice(quoteId, q, docs, schedule, [...existing, ...created], inv);
  }
  return created;
}

/**
 * Email a new invoice: the client gets it with the PDF attached, the office gets a copy.
 * If the PDF can't be made, the emails still go (with the link to the invoice page).
 */
export async function sendInvoice(quoteId: string, q: Pick<QuoteRow, "reference" | "clientName" | "clientEmail">, docs: QuoteDocs, schedule: QuoteDocs["payments"], all: InvoiceRow[], inv: InvoiceRow, paidToDate?: number) {
  const pdf = await renderInvoicePdf(docs, inv, {
    contract: Math.round(schedule.reduce((s, r) => s + r.amount, 0) * 100) / 100,
    earlier: all.map(i => ({ number: i.number, label: i.label, issuedOn: i.issuedOn, gross: i.gross })), paidToDate,
  }).catch(e => { console.error("[invoices] pdf", e); return null; });
  const sent = await emailInvoice({ quoteId, reference: q.reference, clientName: q.clientName, clientEmail: q.clientEmail, number: inv.number, label: inv.label, gross: inv.gross, dueOn: inv.dueOn, pdf });
  if (sent.sent) await markInvoiceEmailed(db(), inv.id);
  return sent;
}

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
    contractActive += loaded.customer.gross + loaded.variations.gross;
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
    if (!loaded.job.startDate && !loaded.input.terms.startDate) todos.push({ level: loaded.portal.requestedStart ? "soon" : "info", kind: "start", text: `${ref}: ${loaded.portal.requestedStart ? `client would like to start from ${loaded.portal.requestedStart} – confirm the start date` : "set the start date"}`, href, quoteId: j.quoteId });
    const clientSnags = loaded.snags.filter(s => s.status === "OPEN" && s.raisedByKind === "CLIENT").length;
    if (clientSnags) todos.push({ level: "soon", kind: "snag", text: `${ref}: ${clientSnags} snag${clientSnags > 1 ? "s" : ""} raised by the client`, href: `${href}?tab=snags`, quoteId: j.quoteId });
    if (!loaded.portal.managerName && loaded.portalOn) todos.push({ level: "info", kind: "manager", text: `${ref}: name the project manager for the client`, href, quoteId: j.quoteId });
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

/** One invoice with its paid status and the running account on the contract (for the invoice page). */
export function invoiceFor(job: LoadedJob, number: string) {
  const inv = job.invoices.find(i => i.number === number);
  if (!inv) return null;
  const row = job.money.rows.find(r => r.n === inv.scheduleNo);
  return {
    inv: { number: inv.number, label: inv.label, description: inv.description, issuedOn: inv.issuedOn, dueOn: inv.dueOn, net: inv.net, vat: inv.vat, gross: inv.gross },
    status: { paid: row?.paid ?? 0, balance: row ? row.balance : inv.gross },
    account: { contract: Math.round(job.schedule.reduce((s, r) => s + r.amount, 0) * 100) / 100, paidToDate: job.money.received,
      invoiced: job.invoices.map(i => ({ number: i.number, label: i.label, issuedOn: i.issuedOn, gross: i.gross })) },
  };
}
