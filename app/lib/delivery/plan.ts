import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { canonicalJson } from "@/app/lib/pricing/engine";
import { costKeys } from "@/app/lib/pricing/schema";
import { QUOTE_ENGINE_VERSION, QuoteResult } from "@/app/lib/quotes/calculate";

export class ConversionError extends Error {}
export const conversionSchema = z.object({
  quoteId: z.string().uuid(), revisionId: z.string().uuid(),
  projectName: z.string().trim().min(3).max(200),
  acceptedAt: z.string().datetime({ offset: true }),
  acceptedBy: z.string().trim().min(2).max(200),
  evidence: z.string().trim().min(10).max(4000),
  confirmed: z.literal(true),
  approvedOptionalKeys: z.array(z.string().min(1).max(200)).max(300).refine(v => new Set(v).size === v.length, "Duplicate optional approval"),
  existingClientId: z.string().uuid().optional(),
}).strict();
export type ConversionInput = z.infer<typeof conversionSchema>;
const componentSchema: z.ZodType<Component> = z.lazy(() => z.object({
  item: z.object({ id: z.string(), name: z.string(), itemType: z.string() }).passthrough(),
  unit: z.object({ label: z.string() }).passthrough(), quantity: z.string(), supplyBy: z.string(),
  price: z.object({ materialUnitCost: z.string(), labourUnitCost: z.string().nullable() }).passthrough(),
  labour: z.array(z.object({ roleId: z.string(), roleName: z.string(), personHours: z.string(), durationHours: z.string(), teamSize: z.number(), chargedFromRecipe: z.boolean(), cost: z.string() }).passthrough()),
  supporting: z.array(componentSchema),
  options: z.array(z.object({ version: z.object({ rule: z.object({ materialDelta: z.string(), labourDelta: z.string() }).passthrough() }).passthrough() }).passthrough()),
}).passthrough());
type Component = { item: { id: string; name: string; itemType: string }; unit: { label: string }; quantity: string; supplyBy: string; price: { materialUnitCost: string; labourUnitCost: string | null }; labour: { roleId: string; roleName: string; personHours: string; durationHours: string; teamSize: number; chargedFromRecipe: boolean; cost: string }[]; supporting: Component[]; options: { version: { rule: { materialDelta: string; labourDelta: string } } }[] };
type Requirement = { kind: "MATERIAL" | "LABOUR"; description: string; quantity: string | null; unit: string; supplyBy: string; needsReview: boolean; snapshot: unknown };

// Copy frozen values; never call the pricing engine or read current catalogue rates.
export function projectPlan(raw: unknown, expectedHash: string, approvedOptionalKeys: string[]) {
  const result = raw as QuoteResult;
  if (!result || result.engineVersion !== QUOTE_ENGINE_VERSION) throw new ConversionError("This quote needs its original supported snapshot format.");
  const { snapshotHash, ...payload } = result;
  if (snapshotHash !== expectedHash || createHash("sha256").update(canonicalJson(payload)).digest("hex") !== expectedHash) throw new ConversionError("Quote snapshot verification failed.");
  if (result.customer.hasUnpricedRequirements) throw new ConversionError("Resolve unpriced requirements before conversion.");
  const optional = result.internalLines.filter(l => l.result.lines[0].priced && l.result.lines[0].inclusion === "OPTIONAL").map(l => l.key);
  if (new Set(approvedOptionalKeys).size !== approvedOptionalKeys.length || approvedOptionalKeys.some(k => !optional.includes(k))) throw new ConversionError("An optional approval does not belong to this revision.");
  const approved = result.internalLines.filter(l => { const line = l.result.lines[0]; return line.priced && (line.inclusion === "INCLUDED" || approvedOptionalKeys.includes(line.key)); });
  if (!approved.length) throw new ConversionError("The accepted scope must contain at least one priced line.");
  const stages = [...new Set(approved.map(l => l.presentation.stage || "Unassigned stage"))];
  const rooms = [...new Set(approved.map(l => l.presentation.room || "Whole project"))];
  stages.sort((a, b) => { const rank = (v: string) => { const i = result.document.stageOrder.indexOf(v); return i < 0 ? Number.MAX_SAFE_INTEGER : i; }; return rank(a) - rank(b); });
  rooms.sort((a, b) => { const rank = (v: string) => { const i = result.document.roomOrder.indexOf(v); return i < 0 ? Number.MAX_SAFE_INTEGER : i; }; return rank(a) - rank(b); });
  const tasks = approved.map((entry, order) => {
    const line = entry.result.lines[0];
    if (!line.priced) throw new ConversionError("Unexpected unpriced line.");
    const requirements: Requirement[] = [];
    function walk(rawComponent: unknown) {
      const c = componentSchema.parse(rawComponent);
      if (new Prisma.Decimal(c.price.materialUnitCost).gt(0) || c.item.itemType === "MATERIAL" || c.options.some(o => new Prisma.Decimal(o.version.rule.materialDelta).gt(0))) requirements.push({ kind: "MATERIAL", description: c.item.name, quantity: c.quantity, unit: c.unit.label, supplyBy: c.supplyBy, needsReview: c.item.itemType !== "MATERIAL", snapshot: c });
      for (const work of c.labour) requirements.push({ kind: "LABOUR", description: work.roleName, quantity: work.personHours, unit: "person-hours", supplyBy: "CONTRACTOR", needsReview: false, snapshot: work });
      if (!c.labour.length && c.price.labourUnitCost !== null && new Prisma.Decimal(c.price.labourUnitCost).gt(0)) requirements.push({ kind: "LABOUR", description: `${c.item.name}: labour allowance, effort to plan`, quantity: null, unit: "unquantified", supplyBy: "CONTRACTOR", needsReview: true, snapshot: { item: c.item, quantity: c.quantity, unitCost: c.price.labourUnitCost } });
      if (c.options.some(o => new Prisma.Decimal(o.version.rule.labourDelta).gt(0))) requirements.push({ kind: "LABOUR", description: `${c.item.name}: specification option effort to review`, quantity: null, unit: "unquantified", supplyBy: "CONTRACTOR", needsReview: true, snapshot: c.options });
      c.supporting.forEach(walk);
    }
    if (line.type === "ITEM") walk(line.source);
    else {
      if (new Prisma.Decimal(line.costs.material).plus(line.costs.supportingMaterial).gt(0)) requirements.push({ kind: "MATERIAL", description: `${entry.presentation.description}: material allowance`, quantity: null, unit: "unquantified", supplyBy: "CONTRACTOR", needsReview: true, snapshot: line.source });
      if (new Prisma.Decimal(line.costs.labour).gt(0)) requirements.push({ kind: "LABOUR", description: `${entry.presentation.description}: labour allowance`, quantity: null, unit: "unquantified", supplyBy: "CONTRACTOR", needsReview: true, snapshot: line.source });
    }
    return { key: line.key, order, description: entry.presentation.description, section: entry.presentation.section, stage: entry.presentation.stage || "Unassigned stage", room: entry.presentation.room || "Whole project", quantity: line.quantity, unit: line.unit, snapshot: entry, requirements };
  });
  const lines = approved.map(l => l.result.lines[0]).filter(l => l.priced);
  const moneyKeys = ["costSubtotal", "contingency", "markup", "discount", "net", "vat", "gross"] as const;
  const money = Object.fromEntries(moneyKeys.map(k => [k, lines.reduce((sum, l) => sum.plus(l[k]), new Prisma.Decimal(0)).toFixed(2)])) as Record<typeof moneyKeys[number], string>;
  const costs = Object.fromEntries(costKeys.map(k => [k, lines.reduce((sum, l) => sum.plus(l.costs[k]), new Prisma.Decimal(0)).toFixed(2)]));
  const baseline = { currency: "GBP", ...money, costs, personHours: lines.reduce((sum, l) => sum.plus(l.personHours), new Prisma.Decimal(0)).toFixed(6), sequentialDurationHours: lines.reduce((sum, l) => sum.plus(l.sequentialDurationHours), new Prisma.Decimal(0)).toFixed(6), note: "Frozen accepted values. Labour hours are effort allowances, not scheduled dates. Estimator fees are separate." };
  return { schemaVersion: 1, quoteSnapshotHash: expectedHash, stages, rooms, tasks, baseline, scope: { title: result.customer.title, address: result.customer.address, assumptions: result.customer.assumptions, exclusions: result.customer.exclusions, terms: result.customer.terms, approvedLineKeys: tasks.map(t => t.key), approvedOptionalKeys, omittedLineKeys: result.internalLines.filter(l => !tasks.some(t => t.key === l.key)).map(l => l.key) } };
}
