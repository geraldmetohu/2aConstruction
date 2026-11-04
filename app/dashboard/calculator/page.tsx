import type { Metadata } from "next";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyProfile, readCommercialDefaults, resolveTakeoffPrices } from "@/app/lib/takeoff/prices.server";
import { takeoffInputSchema } from "@/app/lib/takeoff/schema";
import { getQuote, markSeen, prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { TakeoffCalculator, type SavedQuote } from "./TakeoffCalculator";

export const metadata: Metadata = { title: "Quote calculator" };
export const dynamic = "force-dynamic";

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ quote?: string }> }) {
  await requireCatalogueAdmin();
  const { quote: quoteId } = await searchParams;
  const db = prismaDb(prisma);
  const [{ rates, prices, notes }, commercial, storage, { company }] = await Promise.all([resolveTakeoffPrices(), readCommercialDefaults(), storageReady(db), companyProfile()]);

  let saved: SavedQuote | null = null;
  if (storage && quoteId && z.string().uuid().safeParse(quoteId).success) {
    const q = await getQuote(db, quoteId);
    if (q?.latest) {
      const input = takeoffInputSchema.safeParse(q.latest.input);
      if (input.success) {
        saved = {
          id: q.quote.id, reference: q.quote.reference, status: q.quote.status, version: q.quote.currentVersion, publishedVersion: q.quote.publishedVersion,
          client: { name: q.quote.clientName, email: q.quote.clientEmail, address: q.quote.siteAddress },
          input: input.data,
          versions: q.versions.map(v => ({ version: v.version, reason: v.reason, gross: v.gross, visibleToClient: v.visibleToClient, createdAt: new Date(v.createdAt).toISOString() })),
          events: q.events.map(e => ({ kind: e.kind, message: e.message, actorKind: e.actorKind, createdAt: new Date(e.createdAt).toISOString() })),
        };
        await markSeen(db, quoteId, "ADMIN");
      }
    }
  }
  return <TakeoffCalculator key={saved ? `${saved.id}:${saved.version}` : "new"} rates={rates} prices={prices} notes={notes} commercial={commercial} storage={storage} saved={saved} company={company} />;
}
