import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { db, jobsAvailable, loadJob } from "@/app/lib/takeoff/jobs.server";
import { markSeen } from "@/app/lib/takeoff/store";
import { JobWorkspace } from "./JobWorkspace";
import { documentsReady } from "@/app/lib/takeoff/job-documents";

export const metadata: Metadata = { title: "Job" };
export const dynamic = "force-dynamic";

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireCatalogueAdmin();
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  if (!(await jobsAvailable())) return <main className="p-6 text-sm text-amber-900">Jobs need the new database tables (migration 20261102120000_add_takeoff_jobs).</main>;
  const job = await loadJob(id);
  if (!job?.admin) notFound();
  await markSeen(db(), id, "ADMIN");
  const a = job.admin;
  const docsReady = await documentsReady(db());
  return <JobWorkspace initialTab={tab} job={{
    quoteId: id, reference: job.quote.reference, status: job.quote.status, clientName: job.quote.clientName, clientEmail: job.quote.clientEmail, siteAddress: job.quote.siteAddress,
    jobStatus: job.job.status, startDate: job.job.startDate ?? job.input.terms.startDate ?? "", contacts: job.job.clientContacts, accessNotes: job.job.accessNotes, phone: job.input.terms.clientPhone,
    progress: job.progress, events: job.events.map(e => ({ ...e, createdAt: new Date(e.createdAt).toISOString() })),
    photos: job.photos.map(p => ({ id: p.id, url: p.url, caption: p.caption, stage: p.stage, visibleToClient: p.visibleToClient, favourite: p.favourite, createdAt: new Date(p.createdAt).toISOString() })),
    documents: job.documents.map(d => ({ id: d.id, category: d.category, title: d.title, fileName: d.fileName, url: d.url, mimeType: d.mimeType, sizeBytes: d.sizeBytes, note: d.note, visibleToClient: d.visibleToClient, createdAt: new Date(d.createdAt).toISOString() })),
    docsReady,
    actions: job.actions.map(x => ({ ...x, createdAt: new Date(x.createdAt).toISOString(), respondedAt: x.respondedAt ? new Date(x.respondedAt).toISOString() : null })),
    supplies: job.supplies, money: job.money, variations: job.variations, payments: job.payments.map(p => ({ ...p, createdAt: new Date(p.createdAt).toISOString() })),
    finance: a.finance, expenses: a.expenses.map(e => ({ ...e, createdAt: new Date(e.createdAt).toISOString() })),
    team: a.team.map(t => ({ ...t, worker: { ...t.worker, createdAt: new Date(t.worker.createdAt).toISOString() } })),
    workers: a.workers.map(w => ({ id: w.id, name: w.name, trade: w.trade, kind: w.kind, payBasis: w.payBasis, dayRate: w.dayRate, phone: w.phone, email: w.email, rating: w.rating, active: w.active })),
    checkIns: a.checkIns.map(c => ({ ...c, at: new Date(c.at).toISOString() })),
    toOrder: a.toOrder, orders: a.orders.map(o => ({ ...o, updatedAt: new Date(o.updatedAt).toISOString() })),
    stageMaterials: job.docs.programme.filter(r => r.days > 0).map(r => ({
      stage: r.stage, label: r.label, start: r.start ?? null,
      items: a.result.lines.filter(l => l.stage === r.stage && (l.kind === "MATERIAL" || l.kind === "SUPPORTING") && !l.excluded && !l.clientSupplied).map(l => ({ description: l.description, quantity: l.quantity, unit: l.unit })),
    })).filter(s => s.items.length),
    portalOn: job.portalOn, requestedStart: job.portal.requestedStart,
    manager: { name: job.portal.managerName, phone: job.portal.managerPhone, email: job.portal.managerEmail },
    invoices: job.invoices.map(i => { const r = job.money.rows.find(x => x.n === i.scheduleNo); return { number: i.number, label: i.label, scheduleNo: i.scheduleNo, issuedOn: i.issuedOn, dueOn: i.dueOn, gross: i.gross, balance: r ? r.balance : i.gross, emailed: !!i.emailedAt }; }),
    snags: job.snags.map(s => ({ id: s.id, title: s.title, detail: s.detail, location: s.location, photoUrl: s.photoUrl, status: s.status, raisedByKind: s.raisedByKind, doneByKind: s.doneByKind, doneAt: s.doneAt ? new Date(s.doneAt).toISOString() : null, createdAt: new Date(s.createdAt).toISOString() })),
  }} />;
}
