import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { PricingRequest } from "@/app/lib/pricing/schema";
import { measuredWork, Requirements, uncertainty, workCodes, workLabels } from "./requirements";
import { PremiumError } from "./errors";

// Company-approved IDs stay on the server; the public form uses only work codes.
const mappedItem = z.object({ itemId: z.string().uuid(), upgradeOptionId: z.string().uuid().optional(), standardDescription: z.string().min(1).max(500).optional(), upgradeDescription: z.string().min(1).max(500).optional() }).strict();
export const mappingSchema = z.object({ version: z.string().min(1).max(100), work: z.record(z.enum(workCodes), mappedItem), roofVariants: z.record(mappedItem).default({}) }).strict();
export type WorkMapping = z.infer<typeof mappingSchema>;
export function readMapping() {
  const mapping = mappingSchema.parse(JSON.parse(process.env.PREMIUM_ESTIMATOR_MAPPING_JSON ?? "{}"));
  for (const item of [...Object.values(mapping.work), ...Object.values(mapping.roofVariants)]) {
    if (!item.standardDescription || (item.upgradeOptionId && !item.upgradeDescription)) throw new Error("Public specification descriptions are required before enabling premium payments.");
  }
  return mapping;
}
export function publicSpecifications(mapping: WorkMapping) {
  return Object.fromEntries([...Object.entries(mapping.work), ...Object.entries(mapping.roofVariants).map(([key, value]) => [`roof:${key}`, value] as const)].map(([key, value]) => [key, { standard: value.standardDescription!, ...(value.upgradeDescription ? { upgrade: value.upgradeDescription } : {}) }]));
}
export function mapRequirements(requirements: Requirements, mapping: WorkMapping, asOf: string): PricingRequest {
  const lines: PricingRequest["lines"] = [];
  for (const room of requirements.rooms) for (const work of room.works) {
    const reasons = uncertainty(room, work);
    const key = `${room.key}-${work.code}`;
    if (reasons.length) { lines.push({ key, type: "UNPRICED", description: `${room.name}: ${workLabels[work.code]}${work.inclusion === "optional" ? " (optional)" : ""}`, reason: reasons.join("; ") }); continue; }
    const match = work.code === "roof" ? mapping.roofVariants?.[`${work.roofType}:${work.roofCovering}`] : mapping.work[work.code];
    if (!match || (work.specification === "upgrade" && !match.upgradeOptionId)) throw new PremiumError(`${workLabels[work.code]} needs an approved specification before payment can be accepted. Please contact us to review this scope.`);
    const quantity = work.code === "flooring" ? { kind: "AREA" as const, length: room.length, width: room.width }
      : ["painting", "plastering"].includes(work.code) ? { kind: "WALL" as const, length: new Prisma.Decimal(room.length).plus(room.width).times(2).toString(), height: room.height, openingsAreaM2: room.openings }
      : work.code === "groundworks" ? { kind: "VOLUME" as const, length: work.measure, width: "1", depth: "1" }
      : work.code in measuredWork ? { kind: "AREA" as const, length: work.measure, width: "1" }
      : { kind: "EXPLICIT" as const, value: work.quantity };
    lines.push({ key, type: "ITEM", itemId: match.itemId, room: room.name, stage: work.code === "roof" ? "Roof" : work.code === "groundworks" ? "Groundworks" : work.code === "structure" ? "Structure" : work.code === "landscaping" ? "External works" : "Interior works", quantity,
      condition: work.condition === "new" ? (requirements.project === "new" ? "NEW_BUILD" : "NEW_INSTALLATION") : work.condition === "repair" ? "REPAIR" : "REFURBISHMENT",
      supplyBy: work.supply === "client" ? "CLIENT" : work.supply === "existing" ? "EXISTING" : "CONTRACTOR",
      inclusion: work.inclusion === "optional" ? "OPTIONAL" : "INCLUDED", selected: false,
      optionIds: work.specification === "upgrade" ? [match.upgradeOptionId!] : [],
    });
    if (work.code === "roof") {
      for (const [label, value] of [["Roof windows", work.roofWindows === "" ? "Quantity to confirm" : work.roofWindows], ["Roof insulation", work.roofInsulation], ["Guttering", work.guttering]]) {
        if (value !== "no" && value !== "0") lines.push({ key: `${key}-${label}`, type: "UNPRICED", description: `${room.name}: ${label}`, reason: `${value} — separate roof accessory scope requires review; excluded from the covering price.` });
      }
    }
  }
  if (!lines.some(l => l.type === "ITEM" && l.inclusion === "INCLUDED")) throw new PremiumError("Add at least one included item with confirmed measurements and specification before paying. You can use the normal estimator for an initial enquiry.");
  return { asOf, currency: "GBP", lines, specialRequests: requirements.specialRequests ? [requirements.specialRequests] : [] };
}
