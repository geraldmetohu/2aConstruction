"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { db, jobsAvailable } from "@/app/lib/takeoff/jobs.server";
import {
  addAction, addEvent, addExpense, addPhotos, assignWorker, checkIn, rateWorker, recordPayment, reviewPayment, saveClientInfo, saveWorker,
  setActionStatus, setOrder, setStage, setSupply, setWorkerToken, updateJob, updatePhoto, voidExpense, getWorker,
} from "@/app/lib/takeoff/jobs-store";
import { StoreError } from "@/app/lib/takeoff/store";
import { hashCrewToken, newCrewToken } from "@/app/lib/takeoff/crew-token.server";
import { sendMail, siteUrl } from "@/app/lib/takeoff/mail.server";
import { addDocuments, updateDocument } from "@/app/lib/takeoff/job-documents";

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };
const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date");
const money = z.number().finite().positive().max(10_000_000);
const fail = (e: unknown): { ok: false; message: string } => ({ ok: false, message: e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : e instanceof Error && /permission/.test(e.message) ? e.message : "Something went wrong. Please try again." });

async function run<T extends object>(quoteId: string | null, fn: (actor: string) => Promise<T | void>): Promise<Result<T>> {
  try {
    const actor = await requireCatalogueAdmin();
    if (!(await jobsAvailable())) throw new StoreError("Jobs need the new database tables (migration 20261102120000_add_takeoff_jobs).");
    const r = await fn(actor);
    if (quoteId) { revalidatePath(`/dashboard/jobs/${quoteId}`); revalidatePath(`/my-quotes/${quoteId}`); }
    revalidatePath("/dashboard/jobs"); revalidatePath("/dashboard"); revalidatePath("/dashboard/team");
    return { ok: true, ...(r ?? {}) } as Result<T>;
  } catch (e) { return fail(e); }
}

export async function updateJobAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ status: z.enum(["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]).optional(), startDate: day.nullable().optional() }).parse(raw);
    await updateJob(db(), uuid.parse(quoteId), p, actor);
  });
}

export async function setStageAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ stage: z.string().min(1).max(200), label: z.string().max(200), status: z.enum(["NOT_STARTED", "IN_PROGRESS", "DONE"]), percent: z.number().int().min(0).max(100), note: z.string().trim().max(500) }).parse(raw);
    await setStage(db(), uuid.parse(quoteId), p.stage, p, actor, p.label);
  });
}

export async function addPhotosAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const files = z.array(z.object({ url: z.string().url().max(1000), caption: z.string().max(200).optional(), stage: z.string().max(200).optional() })).min(1).max(40).parse(raw);
    await addPhotos(db(), uuid.parse(quoteId), files, actor);
  });
}

export async function updatePhotoAction(quoteId: string, id: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ caption: z.string().trim().max(200).optional(), stage: z.string().max(200).optional(), visibleToClient: z.boolean().optional(), favourite: z.boolean().optional(), hidden: z.boolean().optional() }).parse(raw);
    await updatePhoto(db(), uuid.parse(id), p, actor);
  });
}

export async function postMessageAction(quoteId: string, text: string, internal: boolean) {
  return run(quoteId, async actor => {
    const t = z.string().trim().min(1, "Write a message").max(4000).parse(text);
    await addEvent(db(), uuid.parse(quoteId), internal ? "NOTE" : "MESSAGE", t, "ADMIN", actor, !internal);
  });
}

export async function addClientActionAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ kind: z.enum(["QUESTION", "DECISION", "ORDER", "DOCUMENT", "ACCESS", "OTHER"]), title: z.string().trim().min(3).max(200), detail: z.string().trim().max(2000), dueDate: day.nullable() }).parse(raw);
    await addAction(db(), uuid.parse(quoteId), p, actor);
  });
}

export async function setClientActionStatusAction(quoteId: string, id: string, status: "OPEN" | "DONE" | "CANCELLED") {
  return run(quoteId, async actor => { await setActionStatus(db(), uuid.parse(quoteId), uuid.parse(id), z.enum(["OPEN", "DONE", "CANCELLED"]).parse(status), actor); });
}

export async function setSupplyAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ itemKey: z.string().min(1).max(300), label: z.string().max(300), status: z.enum(["TO_ORDER", "ORDERED", "DELIVERED"]), note: z.string().trim().max(500) }).parse(raw);
    await setSupply(db(), uuid.parse(quoteId), p.itemKey, p.status, p.note, actor, "ADMIN", p.label);
  });
}

export async function setOrderAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ stage: z.string().min(1).max(200), status: z.enum(["ORDERED", "DELIVERED"]), supplier: z.string().trim().max(120), note: z.string().trim().max(500) }).parse(raw);
    await setOrder(db(), uuid.parse(quoteId), p.stage, p, actor);
  });
}

export async function recordPaymentAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ scheduleNo: z.number().int().min(1).max(20).nullable(), amount: money, method: z.enum(["BANK_TRANSFER", "CARD", "CASH", "CHEQUE"]), reference: z.string().trim().max(80), paidOn: day, note: z.string().trim().max(500) }).parse(raw);
    await recordPayment(db(), uuid.parse(quoteId), p, actor, "ADMIN");
  });
}

export async function reviewPaymentAction(quoteId: string, id: string, status: "CONFIRMED" | "REJECTED") {
  return run(quoteId, async actor => { await reviewPayment(db(), uuid.parse(id), z.enum(["CONFIRMED", "REJECTED"]).parse(status), actor); });
}

export async function addExpenseAction(raw: unknown) {
  const p = z.object({ quoteId: uuid.nullable(), workerId: uuid.nullable(), category: z.enum(["MATERIALS", "PLANT", "SKIPS", "LABOUR", "SUBCONTRACTOR", "FEES", "OVERHEAD", "OTHER"]), description: z.string().trim().max(300), supplier: z.string().trim().max(120), amount: money, spentOn: day }).safeParse(raw);
  if (!p.success) return fail(p.error);
  return run(p.data.quoteId, async actor => { await addExpense(db(), p.data, actor); });
}

export async function voidExpenseAction(quoteId: string | null, id: string) {
  return run(quoteId, async () => { await voidExpense(db(), uuid.parse(id)); });
}

export async function assignWorkerAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ workerId: uuid, trade: z.string().trim().max(80), payBasis: z.enum(["DAY", "JOB"]), dayRate: money.nullable(), agreedPrice: money.nullable(), active: z.boolean() }).parse(raw);
    await assignWorker(db(), uuid.parse(quoteId), p.workerId, p, actor);
  });
}

export async function adminCheckInAction(quoteId: string, raw: unknown) {
  return run(quoteId, async () => {
    const p = z.object({ workerId: uuid, kind: z.enum(["IN", "OUT"]), at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/), note: z.string().trim().max(200) }).parse(raw);
    // The time is entered in London time; store it with the right offset.
    const local = new Date(`${p.at}:00Z`);
    const offset = new Date(local.toLocaleString("en-US", { timeZone: "Europe/London" })).getTime() - new Date(local.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
    await checkIn(db(), p.workerId, uuid.parse(quoteId), p.kind, {}, "ADMIN", p.note || "Entered by office", new Date(local.getTime() - offset).toISOString());
  });
}

export async function rateWorkerAction(workerId: string, score: number, note: string, quoteId: string | null) {
  return run(quoteId, async actor => { await rateWorker(db(), uuid.parse(workerId), score, z.string().trim().max(300).parse(note), quoteId ? uuid.parse(quoteId) : null, actor); });
}

export async function saveClientInfoAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ contacts: z.array(z.object({ name: z.string().trim().max(80), role: z.string().trim().max(60), phone: z.string().trim().max(40), email: z.string().trim().max(120) })).max(10), accessNotes: z.string().trim().max(2000) }).parse(raw);
    await saveClientInfo(db(), uuid.parse(quoteId), p, actor, "ADMIN");
  });
}

// ---------------------------------------------------------------- Team

const workerSchema = z.object({
  id: uuid.optional(), name: z.string().trim().min(2, "Enter the name").max(100), kind: z.enum(["EMPLOYEE", "SUBCONTRACTOR"]), trade: z.string().trim().max(80),
  phone: z.string().trim().max(40), email: z.union([z.literal(""), z.string().trim().email("Check the email")]), payBasis: z.enum(["DAY", "JOB"]), dayRate: money.nullable(), notes: z.string().trim().max(1000), active: z.boolean(),
});
export async function saveWorkerAction(raw: unknown) {
  return run<{ id: string }>(null, async () => saveWorker(db(), workerSchema.parse(raw)));
}

/** New personal check-in link (the old one stops working). Emails it when email is set up and asked for. */
export async function checkInLinkAction(workerId: string, email: boolean) {
  return run<{ url: string; emailed: boolean; emailNote?: string }>(null, async () => {
    const id = uuid.parse(workerId);
    const w = await getWorker(db(), id);
    if (!w) throw new StoreError("Worker not found.");
    const token = newCrewToken();
    await setWorkerToken(db(), id, hashCrewToken(token));
    const url = `${siteUrl()}/crew/${token}`;
    let emailed = false, emailNote: string | undefined;
    if (email) {
      if (!w.email) emailNote = "No email address saved for this person.";
      else {
        const r = await sendMail({ to: w.email, subject: "Your 2A Construction check-in link", text: `Hi ${w.name},\n\nUse this link every day to check in when you arrive on site and check out when you leave:\n${url}\n\nKeep it to yourself – it is personal to you.\n\nThanks` });
        emailed = r.sent; if (!r.sent) emailNote = r.reason;
      }
    }
    return { url, emailed, emailNote };
  });
}

// ---------------------------------------------------------------- Documents

const docCategory = z.enum(["PLANS", "STRUCTURAL", "PLANNING", "BUILDING_CONTROL", "CONTRACT", "HEALTH_SAFETY", "CERTIFICATE", "WARRANTY", "INVOICE", "SURVEY", "PARTY_WALL", "OTHER"]);

export async function addDocumentsAction(quoteId: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({
      category: docCategory, visibleToClient: z.boolean(),
      files: z.array(z.object({ url: z.string().url().max(1000), fileName: z.string().max(300), mimeType: z.string().max(120), sizeBytes: z.number().int().min(0) })).min(1).max(20),
    }).parse(raw);
    await addDocuments(db(), uuid.parse(quoteId), p.files.map(f => ({ ...f, category: p.category, visibleToClient: p.visibleToClient })), actor);
  });
}

export async function updateDocumentAction(quoteId: string, id: string, raw: unknown) {
  return run(quoteId, async actor => {
    const p = z.object({ title: z.string().trim().min(1).max(200).optional(), category: docCategory.optional(), note: z.string().trim().max(1000).optional(), visibleToClient: z.boolean().optional(), hidden: z.boolean().optional() }).parse(raw);
    await updateDocument(db(), uuid.parse(quoteId), uuid.parse(id), p, actor);
  });
}
