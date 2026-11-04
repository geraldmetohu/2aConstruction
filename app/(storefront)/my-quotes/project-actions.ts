"use server";
import { revalidatePath } from "next/cache";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { z } from "zod";
import { db, jobsAvailable } from "@/app/lib/takeoff/jobs.server";
import { addEvent, answerAction, recordPayment, saveClientInfo, setSupply } from "@/app/lib/takeoff/jobs-store";
import { getQuote, StoreError } from "@/app/lib/takeoff/store";

const fail = (e: unknown) => ({ ok: false as const, message: e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : "Something went wrong. Please try again or call us." });

/** Only the client the quote was sent to, and only once it is live. */
async function asClient(quoteId: string, acceptedOnly = true) {
  const user = await getKindeServerSession().getUser();
  if (!user?.email) throw new StoreError("Please log in again.");
  if (!(await jobsAvailable())) throw new StoreError("This is not available yet.");
  const q = await getQuote(db(), z.string().uuid().parse(quoteId));
  if (!q || q.quote.clientEmail !== user.email.trim().toLowerCase()) throw new StoreError("Project not found.");
  if (acceptedOnly ? q.quote.status !== "ACCEPTED" : q.quote.status === "DRAFT") throw new StoreError("This is available once the quote is accepted.");
  return user.email.trim().toLowerCase();
}
const done = (quoteId: string) => { revalidatePath(`/my-quotes/${quoteId}`); revalidatePath(`/dashboard/jobs/${quoteId}`); revalidatePath("/dashboard"); return { ok: true as const }; };

export async function clientMessage(quoteId: string, text: string, note: boolean) {
  try {
    const email = await asClient(quoteId, false);
    await addEvent(db(), quoteId, note ? "CLIENT_NOTE" : "CLIENT_MESSAGE", z.string().trim().min(1, "Write something").max(4000).parse(text), "CLIENT", email, true);
    return done(quoteId);
  } catch (e) { return fail(e); }
}

export async function clientAnswer(quoteId: string, actionId: string, response: string) {
  try {
    const email = await asClient(quoteId);
    await answerAction(db(), quoteId, z.string().uuid().parse(actionId), z.string().trim().min(1, "Write your answer").max(2000).parse(response), email);
    return done(quoteId);
  } catch (e) { return fail(e); }
}

export async function clientSupply(quoteId: string, raw: unknown) {
  try {
    const email = await asClient(quoteId);
    const p = z.object({ itemKey: z.string().min(1).max(300), label: z.string().max(300), status: z.enum(["TO_ORDER", "ORDERED", "DELIVERED"]), note: z.string().trim().max(300) }).parse(raw);
    await setSupply(db(), quoteId, p.itemKey, p.status, p.note, email, "CLIENT", p.label);
    return done(quoteId);
  } catch (e) { return fail(e); }
}

export async function clientReportPayment(quoteId: string, raw: unknown) {
  try {
    const email = await asClient(quoteId);
    const p = z.object({ scheduleNo: z.number().int().min(1).max(20).nullable(), amount: z.number().positive().max(10_000_000), paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reference: z.string().trim().max(80) }).parse(raw);
    await recordPayment(db(), quoteId, { ...p, method: "BANK_TRANSFER", note: "" }, email, "CLIENT");
    return done(quoteId);
  } catch (e) { return fail(e); }
}

export async function clientSaveInfo(quoteId: string, raw: unknown) {
  try {
    const email = await asClient(quoteId, false);
    const p = z.object({ contacts: z.array(z.object({ name: z.string().trim().max(80), role: z.string().trim().max(60), phone: z.string().trim().max(40), email: z.string().trim().max(120) })).max(10), accessNotes: z.string().trim().max(2000) }).parse(raw);
    await saveClientInfo(db(), quoteId, p, email, "CLIENT");
    return done(quoteId);
  } catch (e) { return fail(e); }
}
