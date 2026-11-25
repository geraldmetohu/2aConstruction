import type { Metadata } from "next";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyProfile, readCommercialDefaults, resolveTakeoffPrices } from "@/app/lib/takeoff/prices.server";
import { defaultTakeoffInput, takeoffInputSchema } from "@/app/lib/takeoff/schema";
import { getVisit } from "@/app/lib/site-visit/store";
import { visitToTakeoff } from "@/app/lib/site-visit/convert";
import { clientQuoteFormats, getQuote, latestRateSet, markSeen, prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { customItemSchema } from "@/app/lib/takeoff/schema";
import { TakeoffCalculator, type SavedQuote, type VisitPrefill } from "./TakeoffCalculator";
import { getSignerId } from "@/app/lib/takeoff/signer-store";

export const metadata: Metadata = { title: "Quote calculator" };
export const dynamic = "force-dynamic";

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ quote?: string; visit?: string }> }) {
  await requireCatalogueAdmin();
  const { quote: quoteId, visit: visitId } = await searchParams;
  const db = prismaDb(prisma);
  const [{ rates, prices, notes }, commercial, storage, { company }] = await Promise.all([resolveTakeoffPrices(), readCommercialDefaults(), storageReady(db), companyProfile()]);

  const [savedJobs, clientFormats] = storage ? await Promise.all([
    latestRateSet(db).then(r => z.array(customItemSchema).catch([]).parse((r?.overrides as { savedJobs?: unknown } | null)?.savedJobs ?? [])).catch(() => []),
    clientQuoteFormats(db).catch(() => ({})),
  ]) : [[], {}];
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
          signerId: await getSignerId(db, q.quote.id).catch(() => ""),
        };
        await markSeen(db, quoteId, "ADMIN");
      }
    }
  }
  // A new quote from a site visit: everything recorded on the visit, on top of a fresh calculator input.
  let prefill: VisitPrefill | null = null;
  if (!saved && visitId && z.string().uuid().safeParse(visitId).success) {
    const v = await getVisit(db, visitId).catch(() => null);
    if (v) {
      const d = defaultTakeoffInput();
      const base = { ...d, terms: { ...d.terms, format: company.quoteFormat ?? d.terms.format, groupBy: company.quoteGroupBy ?? d.terms.groupBy }, ...(commercial ? { commercial: { ...d.commercial, ...commercial } } : {}) };
      const r = visitToTakeoff({ reference: v.reference, clientName: v.clientName, clientEmail: v.clientEmail, clientPhone: v.clientPhone, siteAddress: v.siteAddress, postcode: v.postcode, types: v.projectTypes, answers: v.answers, takeoff: v.takeoff }, base);
      prefill = { visitId: v.id, reference: v.reference, input: r.input, client: r.client, quoteId: v.quoteId, quoteReference: v.quoteReference, summary: r.summary };
    }
  }
  return <TakeoffCalculator key={saved ? `${saved.id}:${saved.version}` : prefill ? `visit:${prefill.visitId}` : "new"} prefill={prefill} rates={rates} prices={prices} notes={notes} commercial={commercial} storage={storage} saved={saved} company={company} savedJobs={savedJobs} clientFormats={clientFormats} />;
}
