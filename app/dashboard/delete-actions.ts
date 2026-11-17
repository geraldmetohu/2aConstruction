"use server";
// Permanent deletes for the dashboard. Every action needs an admin AND the confirmation word typed
// exactly as shown (checked again here, not only in the browser).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { currentAccount, db, isAdminAccount } from "@/app/lib/auth/session.server";
import { deleteAccount, deleteProject, deleteRecord, deleteWorker, deletesEnabled, describeReport, SINGLE } from "@/app/lib/takeoff/delete-store";

type Result = { ok: true; message: string } | { ok: false; message: string };
const id = z.string().uuid();
const fail = (e: unknown): Result => ({ ok: false, message: e instanceof z.ZodError ? "That item could not be found." : e instanceof Error ? e.message : "Could not delete." });

async function guard(typed: string, word: string) {
  await requireCatalogueAdmin();
  if (typed.trim() !== word.trim()) throw new Error(`Type ${word} exactly to confirm.`);
  const d = db();
  if (!(await deletesEnabled(d))) throw new Error("Deleting needs the database update 20261117120000_confirmed_deletes – apply it first (see the release notes).");
  return d;
}
const refresh = (...paths: string[]) => { for (const p of ["/dashboard", ...paths]) revalidatePath(p); };

/** Delete a quote / project and everything attached to it (job, messages, photos, payments, invoices, expenses, finance). */
export async function deleteProjectAction(quoteId: string, reference: string, typed: string): Promise<Result> {
  try {
    const d = await guard(typed, reference);
    const r = await deleteProject(d, id.parse(quoteId));
    refresh("/dashboard/saved-quotes", "/dashboard/jobs", "/dashboard/finance", "/dashboard/operations", "/my-quotes");
    return { ok: true, message: `Deleted ${reference}: ${describeReport(r)}.` };
  } catch (e) { return fail(e); }
}

/** Delete a team member / subcontractor and their assignments, check-ins, ratings and costs. */
export async function deleteWorkerAction(workerId: string, word: string, typed: string): Promise<Result> {
  try {
    const d = await guard(typed, word);
    const r = await deleteWorker(d, id.parse(workerId));
    refresh("/dashboard/team", "/dashboard/finance", "/dashboard/jobs");
    return { ok: true, message: `Deleted: ${describeReport(r)}.` };
  } catch (e) { return fail(e); }
}

/** Delete a client / trade / staff login (never an admin or yourself). */
export async function deleteAccountAction(accountId: string, word: string, typed: string): Promise<Result> {
  try {
    const d = await guard(typed, word);
    const me = await currentAccount();
    const r = await deleteAccount(d, id.parse(accountId), { selfId: me?.id ?? "", isAdmin: (email, role) => role === "ADMIN" || isAdminAccount({ email, role: role as never, emailVerifiedAt: new Date() }) });
    refresh("/dashboard/accounts");
    return { ok: true, message: `Deleted: ${describeReport(r)}.` };
  } catch (e) { return fail(e); }
}

/** Delete one record: money entry, expense, payment, invoice, photo, document, snag, request, job cost or regular cost. */
export async function deleteRecordAction(kind: string, recordId: string, typed: string, word = "DELETE"): Promise<Result> {
  try {
    if (!(kind in SINGLE)) throw new Error("Unknown record type.");
    const d = await guard(typed, word);
    const r = await deleteRecord(d, kind as keyof typeof SINGLE, id.parse(recordId));
    refresh("/dashboard/finance", "/dashboard/jobs", "/dashboard/operations");
    return { ok: true, message: `Deleted: ${describeReport(r)}.` };
  } catch (e) { return fail(e); }
}
