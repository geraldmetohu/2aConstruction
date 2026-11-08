"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { calculateTakeoff, customerTakeoff, type CustomerTakeoff } from "@/app/lib/takeoff/engine";
import { companyProfile, resolveTakeoffPrices } from "@/app/lib/takeoff/prices.server";
import { buildDocuments } from "@/app/lib/takeoff/documents";
import { renderQuotationPdf } from "@/app/lib/takeoff/quote-pdf.server";
import { customItemSchema, takeoffInputSchema } from "@/app/lib/takeoff/schema";
import { createQuote, getQuote, latestRateSet, prismaDb, saveRateSet, saveVersion, sendQuote, storageReady, StoreError } from "@/app/lib/takeoff/store";
import { emailQuoteSent, emailQuoteUpdated } from "@/app/lib/takeoff/quote-mail.server";

const clientSchema = z.object({
  clientName: z.string().trim().min(1, "Enter the client's name").max(200),
  clientEmail: z.string().trim().email("Enter the client's email – they log in with it to see the quote").max(200),
  siteAddress: z.string().trim().max(1000).default(""),
});
const message = (e: unknown) => e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : "Could not save. Nothing was changed.";

async function ready() {
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) throw new StoreError("Saving needs the new database tables. Apply migration 20261101120000_add_takeoff_quotes first.");
  return db;
}

/** Save as a new quote or a new version. After a quote is sent, saving also notifies the client in their portal. */
export async function saveTakeoffQuote(args: { quoteId?: string; expectedVersion?: number; client: unknown; input: unknown; reason: string }) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = await ready();
    const client = clientSchema.parse(args.client);
    const input = takeoffInputSchema.parse(args.input);
    const reason = z.string().trim().min(3, "Say briefly what changed").max(500).parse(args.reason);
    // Prices are resolved and the quote recalculated on the server; browser totals are never trusted.
    const { rates, prices } = await resolveTakeoffPrices();
    const result = calculateTakeoff(input, prices, rates);
    const payload = { input, result, customer: customerTakeoff(result, input), rates, prices };
    if (args.quoteId) {
      z.string().uuid().parse(args.quoteId);
      const r = await saveVersion(db, args.quoteId, z.number().int().positive().parse(args.expectedVersion), client, payload, reason, actor);
      if (r.notified) await emailQuoteUpdated({ quoteId: args.quoteId, reference: r.reference, clientName: client.clientName, clientEmail: client.clientEmail, reason });
      revalidatePath("/dashboard/saved-quotes");
      return { ok: true as const, id: args.quoteId, version: r.version, notified: r.notified };
    }
    const r = await createQuote(db, client, payload, actor);
    revalidatePath("/dashboard/saved-quotes");
    return { ok: true as const, id: r.id, version: r.version, reference: r.reference, notified: false };
  } catch (e) { return { ok: false as const, message: message(e) }; }
}

export async function sendTakeoffQuote(quoteId: string) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = await ready();
    const id = z.string().uuid().parse(quoteId);
    const r = await sendQuote(db, id, actor);
    const mail = r.already ? { sent: false } : await emailQuoteSent({ quoteId: id, reference: r.reference, clientName: r.clientName, clientEmail: r.clientEmail, pdf: await quotationPdf(db, id) });
    revalidatePath("/dashboard/saved-quotes");
    return { ok: true as const, version: r.version, emailed: mail.sent };
  } catch (e) { return { ok: false as const, message: message(e) }; }
}


/** The quotation PDF for the email; null if it can't be built (the email still goes, with the link). */
async function quotationPdf(db: Awaited<ReturnType<typeof ready>>, quoteId: string) {
  try {
    const q = await getQuote(db, quoteId);
    if (!q?.latest) return null;
    const input = takeoffInputSchema.parse(q.latest.input);
    const { company } = await companyProfile();
    const docs = buildDocuments({ customer: q.latest.customer as CustomerTakeoff, input, company, client: { name: q.quote.clientName, email: q.quote.clientEmail, siteAddress: q.quote.siteAddress },
      reference: q.quote.reference, version: q.quote.currentVersion, issueDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()) });
    return await renderQuotationPdf(docs);
  } catch (e) { console.error("[quote-pdf]", e); return null; }
}

/** Your own saved jobs (custom items you reuse), kept with the company rate settings. */
export async function saveJobToLibrary(raw: unknown, remove?: string) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = await ready();
    const latest = await latestRateSet(db);
    const overrides = ((latest?.overrides ?? {}) as Record<string, unknown>);
    const list = z.array(customItemSchema).catch([]).parse(overrides.savedJobs ?? []);
    let next = list;
    if (remove) next = list.filter(j => j.id !== remove);
    else {
      const job = customItemSchema.parse(raw);
      const id = `j${Date.now().toString(36)}`;
      next = [...list.filter(j => j.title.toLowerCase() !== job.title.toLowerCase()), { ...job, id, area: "" }].slice(-200);
    }
    await saveRateSet(db, latest?.version ?? 0, { ...overrides, savedJobs: next }, remove ? "Saved job removed" : "Job saved to the library", actor);
    revalidatePath("/dashboard/calculator");
    return { ok: true as const, jobs: next };
  } catch (e) { return { ok: false as const, message: message(e) }; }
}
