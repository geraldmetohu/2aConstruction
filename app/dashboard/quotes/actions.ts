"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireQuoteAdmin, quotePolicy } from "@/app/lib/quotes/access";
import { quoteService, QuoteError } from "@/app/lib/quotes/service";
import { calculateQuote } from "@/app/lib/quotes/calculate";
import { PricingError } from "@/app/lib/pricing/engine";
function message(error: unknown) { return error instanceof QuoteError || error instanceof PricingError ? error.message : error instanceof z.ZodError ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") : "Unable to complete this quote action. Your saved revisions remain unchanged."; }
export async function convertEstimate(submissionId: string) {
  try { const actor = await requireQuoteAdmin(); const id = await quoteService(prisma).convert(submissionId, actor); revalidatePath("/dashboard/quotes"); return { ok: true as const, id }; }
  catch (e) { return { ok: false as const, message: message(e) }; }
}
export async function saveQuote(quoteId: string, version: number, raw: string, reason: string) {
  try { const actor = await requireQuoteAdmin(); if (raw.length > 1500000) throw new QuoteError("This quote is too large."); const next = await quoteService(prisma).save(quoteId, version, JSON.parse(raw), reason, actor, quotePolicy()); revalidatePath(`/dashboard/quotes/${quoteId}`); return { ok: true as const, version: next }; }
  catch (e) { return { ok: false as const, message: message(e) }; }
}
export async function previewQuote(quoteId: string, raw: string) {
  try { await requireQuoteAdmin(); z.string().uuid().parse(quoteId); if (raw.length > 1500000) throw new QuoteError("This quote is too large."); const quote = await prisma.draftQuote.findUniqueOrThrow({ where: { id: quoteId } }); const result = calculateQuote(JSON.parse(raw), quote.catalogueSnapshot, quote.pricingAsOf); return { ok: true as const, totals: result.customer.totals, optionalTotals: result.customer.optionalTotals, warnings: result.warnings }; }
  catch (e) { return { ok: false as const, message: message(e) }; }
}
export async function releaseQuote(quoteId: string, version: number, note: string) {
  try { const actor = await requireQuoteAdmin(); await quoteService(prisma).release(quoteId, version, actor, note); revalidatePath(`/dashboard/quotes/${quoteId}`); return { ok: true as const }; }
  catch (e) { return { ok: false as const, message: message(e) }; }
}
