import { z } from "zod";
import { catalogueSchema, requestSchema } from "@/app/lib/pricing/schema";
const text = z.string().trim().min(1).max(4000);
const label = z.string().trim().max(160);
const recipe = catalogueSchema.shape.recipes.element.shape;
const price = catalogueSchema.shape.prices.element;
export const quoteLineSchema = z.object({
  input: requestSchema.innerType().shape.lines.element,
  description: text, section: label, room: label, stage: label,
  overrides: z.object({
    price: price.pick({ materialUnitCost: true, labourUnitCost: true, plantUnitCost: true, wasteUnitCost: true, otherUnitCost: true }).partial().optional(),
    supporting: recipe.supporting.optional(), labour: recipe.labour.optional(),
  }).strict().default({}),
  overrideReason: z.string().trim().max(2000).default(""),
}).strict().superRefine((line, ctx) => {
  if (Object.keys(line.overrides).length && !line.overrideReason) ctx.addIssue({ code: "custom", message: "Explain quote-only cost or recipe changes." });
  if (Object.keys(line.overrides).length && line.input.type !== "ITEM") ctx.addIssue({ code: "custom", message: "Catalogue overrides apply only to catalogue items." });
});
export const quoteDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200), customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().email().max(200), address: z.string().max(1000),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Enter a real validity date."),
  terms: z.string().max(8000), assumptions: z.array(text).max(100), exclusions: z.array(text).max(100),
  sectionOrder: z.array(label).max(100), roomOrder: z.array(label).max(100), stageOrder: z.array(label).max(100),
  lines: z.array(quoteLineSchema).min(1).max(300),
}).strict().superRefine((doc, ctx) => {
  if (new Set(doc.lines.map(l => l.input.key)).size !== doc.lines.length) ctx.addIssue({ code: "custom", message: "Line keys must be unique." });
  for (const key of ["sectionOrder", "roomOrder", "stageOrder"] as const) if (new Set(doc[key]).size !== doc[key].length) ctx.addIssue({ code: "custom", message: "Group ordering must not contain duplicates." });
});
export type QuoteDocument = z.output<typeof quoteDocumentSchema>;
export type QuoteLine = QuoteDocument["lines"][number];
export function sortedLines(doc: QuoteDocument) {
  const rank = (list: string[], value: string) => { const i = list.indexOf(value); return i === -1 ? list.length : i; };
  return [...doc.lines].sort((a, b) => rank(doc.sectionOrder, a.section) - rank(doc.sectionOrder, b.section) || rank(doc.roomOrder, a.room) - rank(doc.roomOrder, b.room) || rank(doc.stageOrder, a.stage) - rank(doc.stageOrder, b.stage));
}
