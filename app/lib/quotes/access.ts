import "server-only";
import { getAuthSession } from "@/app/lib/auth/session.server";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { isCatalogueAdmin } from "@/app/lib/catalogue/validation";
import { prisma } from "@/app/lib/db";
import { z } from "zod";
import { QuoteError } from "./service";
export const quoteEnabled = () => process.env.QUOTE_BUILDER_ENABLED === "true";
export function quotePolicy() { return { discount: process.env.QUOTE_ALLOW_DISCOUNTS === "true", markup: process.env.QUOTE_ALLOW_MARKUP === "true", tax: process.env.QUOTE_ALLOW_VAT_OVERRIDE === "true" }; }
export async function requireQuoteAdmin() {
  const actor = await requireCatalogueAdmin();
  if (!quoteEnabled()) throw new QuoteError("The quote builder is not enabled yet.");
  return actor;
}
export async function viewQuote(quoteId: string, version: number) {
  if (!z.string().uuid().safeParse(quoteId).success || !Number.isSafeInteger(version) || version < 1) return null;
  const user = await getAuthSession().getUser();
  if (!user?.id || (!quoteEnabled() && process.env.QUOTE_STORAGE_READY !== "true")) return null;
  const admin = isCatalogueAdmin(user, process.env.ADMIN_EMAILS);
  // Ownership and release are part of the SQL predicate, not a client check.
  const revision = await prisma.quoteRevision.findFirst({ where: { quoteId, version, ...(admin ? {} : { quote: { ownerId: user.id }, release: { isNot: null } }) }, select: { quoteId: true, version: true, customerResult: true, createdAt: true, snapshotHash: true, release: { select: { id: true } } } });
  return revision ? { ...revision, draft: !revision.release } : null;
}
