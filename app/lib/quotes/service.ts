import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { catalogueSchema, requestSchema } from "@/app/lib/pricing/schema";
import { ENGINE_VERSION } from "@/app/lib/pricing/engine";
import { requirementsSchema } from "@/app/lib/premium/requirements";
import { calculateQuote, QuotePolicy } from "./calculate";
import { quoteDocumentSchema, QuoteDocument } from "./schema";
import { readPlanningDefaults } from "@/app/lib/company-settings/read";
import { addCalendarDays, londonDate } from "@/app/lib/company-settings/defaults";
export class QuoteError extends Error {}
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
const uuid = z.string().uuid();
export function quoteService(db: PrismaClient) {
  async function convert(submissionId: string, actor: string) {
    uuid.parse(submissionId);
    return db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quote-source:${submissionId}`}))`;
      const existing = await tx.draftQuote.findUnique({ where: { sourceSubmissionId: submissionId } });
      if (existing) return existing.id;
      const source = await tx.premiumSubmission.findUniqueOrThrow({ where: { id: submissionId }, include: { payment: { include: { checkout: { include: { request: true } } } } } });
      const snapshot = source.result as Prisma.JsonObject;
      if (snapshot.engineVersion !== ENGINE_VERSION) throw new QuoteError("This estimate requires its original pricing engine version.");
      const request = requestSchema.parse(snapshot.inputSnapshot);
      const catalogue = catalogueSchema.parse(snapshot.catalogueSnapshot);
      const requirements = requirementsSchema.parse(source.payment.checkout.request.requirements);
      const defaults = await readPlanningDefaults(tx);
      const document: QuoteDocument = quoteDocumentSchema.parse({
        title: "Draft construction quote", customerName: requirements.contact.name, customerEmail: requirements.contact.email, address: requirements.postcode,
        validUntil: addCalendarDays(londonDate(), defaults?.quoteValidityDays ?? 30), terms: "Subject to site survey and written agreement before work starts.",
        assumptions: [], exclusions: [], sectionOrder: ["Scope", "To review"], roomOrder: requirements.rooms.map(r => r.name).filter((v, i, a) => a.indexOf(v) === i), stageOrder: [],
        lines: [...request.lines.map(input => ({ input, description: input.type === "ITEM" ? catalogue.items.find(i => i.id === input.itemId)?.name ?? "Item" : input.description, section: input.type === "UNPRICED" ? "To review" : "Scope", room: "room" in input ? input.room ?? "" : "", stage: "stage" in input ? input.stage ?? "" : "", overrides: {}, overrideReason: "" })),
          ...request.specialRequests.map((description, i) => ({ input: { type: "UNPRICED", key: `special-${i}`, description, reason: "Special request requires assessment" }, description, section: "To review", room: "", stage: "", overrides: {}, overrideReason: "" }))],
      });
      const result = calculateQuote(document, catalogue, request.asOf);
      const quote = await tx.draftQuote.create({ data: { sourceSubmissionId: submissionId, ownerId: source.payment.checkout.request.ownerId, catalogueSnapshot: json(catalogue), pricingAsOf: request.asOf, createdBy: actor } });
      await tx.quoteRevision.create({ data: { quoteId: quote.id, version: 1, document: json(document), result: json(result), customerResult: json(result.customer), snapshotHash: result.snapshotHash, reason: "Converted from paid premium estimate", createdBy: actor } });
      return quote.id;
    }, { timeout: 60000 });
  }
  async function save(quoteId: string, expectedVersion: number, raw: unknown, reason: string, actor: string, policy: QuotePolicy) {
    uuid.parse(quoteId); z.number().int().positive().parse(expectedVersion); z.string().trim().min(3).max(2000).parse(reason);
    const document = quoteDocumentSchema.parse(raw);
    return db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quote:${quoteId}`}))`;
      const quote = await tx.draftQuote.findUniqueOrThrow({ where: { id: quoteId }, include: { revisions: { orderBy: { version: "desc" }, take: 1 } } });
      const latest = quote.revisions[0];
      if (latest.version !== expectedVersion) throw new QuoteError("Another revision was saved. Reload and compare it before saving your changes.");
      const previous = quoteDocumentSchema.parse(latest.document);
      const catalogue = catalogueSchema.parse(quote.catalogueSnapshot);
      for (const line of document.lines) {
        if (line.input.type === "UNPRICED") continue;
        const old = previous.lines.find(l => l.input.key === line.input.key)?.input;
        const oldPriced = old && old.type !== "UNPRICED" ? old : undefined;
        if (!policy.discount && new Prisma.Decimal(line.input.discountPercent).comparedTo(oldPriced?.discountPercent ?? "0") !== 0) throw new QuoteError("Discount changes are not permitted by quote policy.");
        if (!policy.markup && new Prisma.Decimal(line.input.markupPercent ?? catalogue.settings.markupPercent).comparedTo(oldPriced?.markupPercent ?? catalogue.settings.markupPercent) !== 0) throw new QuoteError("Markup changes are not permitted by quote policy.");
        const itemId = line.input.type === "ITEM" ? line.input.itemId : null;
        const standardTax = itemId ? catalogue.prices.filter(p => p.itemId === itemId && Date.parse(p.effectiveFrom) <= Date.parse(quote.pricingAsOf)).sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0]?.taxCodeId : catalogue.taxCodes.find(t => t.active && !t.archived)?.id;
        if (!policy.tax && (line.input.taxCodeId ?? standardTax) !== (oldPriced?.taxCodeId ?? standardTax)) throw new QuoteError("VAT changes are not permitted by quote policy.");
      }
      const result = calculateQuote(document, catalogue, quote.pricingAsOf);
      const revision = await tx.quoteRevision.create({ data: { quoteId, version: expectedVersion + 1, document: json(document), result: json(result), customerResult: json(result.customer), snapshotHash: result.snapshotHash, reason: reason.trim(), createdBy: actor } });
      return revision.version;
    }, { timeout: 60000 });
  }
  async function release(quoteId: string, version: number, actor: string, reviewNote: string) {
    uuid.parse(quoteId); z.number().int().positive().parse(version); z.string().trim().min(10).max(2000).parse(reviewNote);
    return db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quote:${quoteId}`}))`;
      const latest = await tx.quoteRevision.findFirstOrThrow({ where: { quoteId }, orderBy: { version: "desc" }, include: { release: true } });
      if (latest.version !== version) throw new QuoteError("Only the latest saved revision can be released. Reload first.");
      if (latest.release) return latest.release.id;
      const customer = latest.customerResult as Prisma.JsonObject;
      if (customer.hasUnpricedRequirements) throw new QuoteError("Resolve unpriced requirements or explicitly exclude them before releasing this quote.");
      if (String(customer.validUntil) < new Date().toISOString().slice(0, 10)) throw new QuoteError("Save a new validity date before releasing an expired quote.");
      return (await tx.quoteRelease.create({ data: { revisionId: latest.id, reviewedBy: actor, reviewNote: reviewNote.trim() } })).id;
    });
  }
  return { convert, save, release };
}
