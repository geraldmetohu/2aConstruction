import { z } from "zod";
export const supplierSchema = z.enum(["SELCO", "BUILDER_DEPOT"]);
const amount = z.string().regex(/^\d{1,10}(\.\d{1,4})?$/).refine(v => Number(v) > 0);
export const observationSchema = z.object({
  itemId: z.string().uuid(), supplier: supplierSchema, sku: z.string().trim().min(1).max(160),
  sourceUrl: z.string().url().max(2000), sourceReference: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200), priceBasis: z.enum(["PUBLIC", "ACCOUNT"]),
  packPrice: amount, packQuantity: z.string().regex(/^\d{1,9}(\.\d{1,6})?$/).refine(v => Number(v) > 0),
  unitCode: z.string().trim().min(1).max(40), currency: z.literal("GBP"), taxInclusive: z.boolean(),
  minimumPacks: z.number().int().min(1).max(100000), observedAt: z.string().datetime({ offset: true }),
}).strict().superRefine((v, ctx) => {
  const u = new URL(v.sourceUrl), hosts = v.supplier === "SELCO" ? ["selcobw.com", "www.selcobw.com"] : ["builderdepot.co.uk", "www.builderdepot.co.uk"];
  if (u.protocol !== "https:" || !hosts.includes(u.hostname) || u.username || u.password || u.port || u.search || u.hash) ctx.addIssue({ code: "custom", message: "Use a supplier HTTPS product URL without credentials or query parameters." });
});
export const batchSchema = z.object({ observations: z.array(observationSchema).min(1).max(200) }).strict();
export type Observation = z.infer<typeof observationSchema>;
