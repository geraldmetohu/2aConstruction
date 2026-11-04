"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { calculateTakeoff, customerTakeoff } from "@/app/lib/takeoff/engine";
import { resolveTakeoffPrices } from "@/app/lib/takeoff/prices.server";
import { takeoffInputSchema } from "@/app/lib/takeoff/schema";
import { createQuote, prismaDb, saveVersion, sendQuote, storageReady, StoreError } from "@/app/lib/takeoff/store";
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
    const mail = r.already ? { sent: false } : await emailQuoteSent({ quoteId: id, reference: r.reference, clientName: r.clientName, clientEmail: r.clientEmail });
    revalidatePath("/dashboard/saved-quotes");
    return { ok: true as const, version: r.version, emailed: mail.sent };
  } catch (e) { return { ok: false as const, message: message(e) }; }
}
