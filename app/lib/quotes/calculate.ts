import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { calculateEstimate, canonicalJson, customerEstimate, ENGINE_VERSION } from "@/app/lib/pricing/engine";
import { catalogueSchema, Catalogue } from "@/app/lib/pricing/schema";
import { quoteDocumentSchema, sortedLines } from "./schema";
export const QUOTE_ENGINE_VERSION = `quote-v1/${ENGINE_VERSION}`;
export type QuotePolicy = { discount: boolean; markup: boolean; tax: boolean };
export function calculateQuote(raw: unknown, rawCatalogue: unknown, asOf: string) {
  const document = quoteDocumentSchema.parse(raw);
  const base = catalogueSchema.parse(rawCatalogue);
  const internalLines = sortedLines(document).map(line => {
    const catalogue = structuredClone(base) as Catalogue;
    if (line.input.type === "ITEM" && Object.keys(line.overrides).length) {
      const itemId = line.input.itemId, condition = line.input.condition;
      if (line.overrides.price) {
        const price = catalogue.prices.filter(p => p.itemId === itemId && Date.parse(p.effectiveFrom) <= Date.parse(asOf)).sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];
        if (!price) throw new Error("No price is available for this quote override.");
        Object.assign(price, line.overrides.price, { id: `quote-${line.input.key}-${price.id}`, source: `Quote-only override: ${line.overrideReason}` });
      }
      if (line.overrides.supporting || line.overrides.labour) {
        const existing = catalogue.recipes.filter(r => r.itemId === itemId && r.condition === condition && r.publishedAt && Date.parse(r.publishedAt) <= Date.parse(asOf) && Date.parse(r.effectiveFrom) <= Date.parse(asOf)).sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];
        const recipe = existing ?? { id: `quote-recipe-${line.input.key}`, itemId, condition, effectiveFrom: asOf, publishedAt: asOf, ruleSchemaVersion: 1 as const, quantityRule: { kind: "per_unit" as const, value: "1" }, assumptions: [], supporting: [], labour: [] };
        if (!existing) catalogue.recipes.push(recipe);
        recipe.id = `quote-${line.input.key}-${recipe.id}`;
        if (line.overrides.supporting) recipe.supporting = line.overrides.supporting;
        if (line.overrides.labour) recipe.labour = line.overrides.labour;
      }
    }
    const input = line.input.type === "UNPRICED" ? { ...line.input, description: line.description } : { ...line.input, ...(line.input.type === "ITEM" ? {} : { description: line.description }), room: line.room, stage: line.stage };
    const result = calculateEstimate({ asOf, currency: "GBP", lines: [input] }, catalogue);
    return { key: input.key, overrideReason: line.overrideReason, result, presentation: { description: line.description, section: line.section, room: line.room, stage: line.stage } };
  });
  const totals = (optional: boolean) => Object.fromEntries(["net", "vat", "gross"].map(key => [key, internalLines.reduce((sum, l) => sum.plus(l.result[optional ? "optionalTotals" : "totals"][key as "net" | "vat" | "gross"]), new Prisma.Decimal(0)).toFixed(2)])) as { net: string; vat: string; gross: string };
  const warnings = [...new Set(internalLines.flatMap(l => l.result.warnings))];
  const assumptions = [...new Set([...document.assumptions, ...internalLines.flatMap(l => l.result.assumptions)])];
  const customer = {
    title: document.title, customerName: document.customerName, customerEmail: document.customerEmail, address: document.address,
    validUntil: document.validUntil, terms: document.terms, assumptions, exclusions: document.exclusions, currency: "GBP" as const,
    lines: internalLines.map(l => ({ ...customerEstimate(l.result).lines[0], ...l.presentation })),
    totals: totals(false), optionalTotals: totals(true), requiresReview: warnings.length > 0,
    hasUnpricedRequirements: internalLines.some(l => l.result.hasUnpricedRequirements),
  };
  const result = { engineVersion: QUOTE_ENGINE_VERSION, asOf, document, catalogueSnapshot: base, internalLines, customer, warnings };
  return { ...result, snapshotHash: createHash("sha256").update(canonicalJson(result)).digest("hex") };
}
export type QuoteResult = ReturnType<typeof calculateQuote>;
export type CustomerQuote = QuoteResult["customer"];
