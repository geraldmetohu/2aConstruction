import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { roomFields } from "@/app/lib/takeoff/modules/rooms";
import { workPackages } from "@/app/lib/takeoff/modules/index";
import type { CustomerTakeoff } from "@/app/lib/takeoff/engine";
import { takeoffInputSchema } from "@/app/lib/takeoff/schema";
import { getClientQuote, markSeen, prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { ClientQuote, type ChoiceField } from "../ClientQuote";
import { ClientProject } from "../ClientProject";
import { firstName } from "../PortalParts";
import { docCategoryLabel } from "@/app/lib/takeoff/job-documents";
import { jobsAvailable, loadJob } from "@/app/lib/takeoff/jobs.server";
import { unreadSince } from "@/app/lib/takeoff/jobs-store";

export const metadata: Metadata = { title: "Your quote", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ClientQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getKindeServerSession().getUser();
  if (!user?.email) redirect("/my-quotes");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) notFound();
  const q = await getClientQuote(db, id, user.email);
  if (!q?.version) notFound();
  const jobsOn = q.quote.status === "ACCEPTED" && (await jobsAvailable());
  const unread = jobsOn ? await unreadSince(db, id, "CLIENT") : 0;
  await markSeen(db, id, "CLIENT");
  const customer = q.version.customer as CustomerTakeoff;
  const input = takeoffInputSchema.parse(q.version.input);
  // Only the client-choice fields (options and labels) go to the browser – no prices or formulas.
  const choiceFields: ChoiceField[] = customer.clientChoices.map(c => {
    const f = (c.scope === "room" ? roomFields : workPackages.find(p => p.id === c.id)?.fields ?? []).find(x => x.key === c.key);
    return { scope: c.scope, id: c.id, area: c.area, key: c.key, label: c.label, value: c.value, type: f?.type === "text" ? "text" : "select", options: c.options };
  });
  const greetingName = firstName(user.given_name) || firstName(q.quote.clientName);
  const quoteProps = {
    id, reference: q.quote.reference, status: q.quote.status, version: q.version.version, customer,
    property: input.property, siteAddress: q.quote.siteAddress, clientName: q.quote.clientName,
    choiceFields, acceptedName: q.quote.acceptedName, acceptedAt: q.quote.acceptedAt ? new Date(q.quote.acceptedAt).toISOString() : null,
    notices: q.unseen.map(u => ({ message: u.message, at: new Date(u.createdAt).toISOString() })),
    history: q.updates.map(u => ({ kind: u.kind, message: u.message, at: new Date(u.createdAt).toISOString() })),
  };
  const quoteView = <ClientQuote {...quoteProps} greetingName={greetingName} />;
  if (!jobsOn) return quoteView;

  // Accepted: the client's project panel. Only client-safe data goes to the browser (no costs, margins or internal notes).
  const job = await loadJob(id, { forClient: true });
  if (!job) return quoteView;
  const c = job.company;
  return <ClientProject greetingName={greetingName} quoteView={<ClientQuote {...quoteProps} embedded />} v={{
    quoteId: id, reference: q.quote.reference, title: job.docs.title, siteAddress: q.quote.siteAddress, status: job.job.status, startDate: job.docs.start ?? null, finish: job.docs.finish ?? null,
    progress: { stages: job.progress.stages, percent: job.progress.percent },
    events: job.events.map(e => ({ id: e.id, kind: e.kind, message: e.message, actorKind: e.actorKind, createdAt: new Date(e.createdAt).toISOString() })),
    photos: job.photos.map(p => ({ id: p.id, url: p.url, caption: p.caption, stage: p.stage, createdAt: new Date(p.createdAt).toISOString() })),
    documents: job.documents.map(d => ({ id: d.id, title: d.title, category: d.category, categoryLabel: docCategoryLabel(d.category), url: d.url, fileName: d.fileName, sizeBytes: d.sizeBytes, createdAt: new Date(d.createdAt).toISOString() })),
    actions: job.actions.map(a => ({ id: a.id, kind: a.kind, title: a.title, detail: a.detail, dueDate: a.dueDate, status: a.status, response: a.response })),
    supplies: job.supplies, money: job.money,
    payments: job.payments.map(p => ({ id: p.id, amount: p.amount, paidOn: p.paidOn, status: p.status, reference: p.reference })),
    bank: { accountName: c.accountName || c.registeredName, sortCode: c.sortCode, accountNumber: c.accountNumber, bankName: c.bankName },
    office: { phone: c.phone, email: c.email, siteManager: c.siteManager, siteManagerPhone: c.siteManagerPhone },
    contacts: job.job.clientContacts, accessNotes: job.job.accessNotes, unread,
  }} />;
}
