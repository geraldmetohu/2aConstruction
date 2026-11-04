import { z } from "zod";
const decimal = (max: number, positive = false) => z.string().regex(/^\d{1,3}(\.\d{1,4})?$/).refine(v => Number(v) <= max && (!positive || Number(v) > 0), "Value is outside the supported range.");
export class SettingsError extends Error {}
export const settingsSchema = z.object({
  requestId: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(1000),
  defaultMarkupPercent: decimal(999), defaultWastePercent: decimal(100), contingencyPercent: decimal(100),
  workdayHours: decimal(24, true), defaultTeamSize: z.number().int().min(1).max(100),
  workingDays: z.array(z.number().int().min(1).max(7)).min(1).max(7).refine(v => new Set(v).size === v.length),
  quoteValidityDays: z.number().int().min(1).max(365), invoiceTermsDays: z.number().int().min(0).max(365),
  estimatorFeeTaxCodeId: z.string().uuid(), currency: z.literal("GBP"), estimatorFeeAmount: z.literal("50.00"), estimatorFeeInclusive: z.literal(true),
}).strict();
export type SettingsInput = z.infer<typeof settingsSchema>;
export const suggestedSettings = { defaultMarkupPercent: "0", defaultWastePercent: "0", contingencyPercent: "0", workdayHours: "8", defaultTeamSize: 1, workingDays: [1,2,3,4,5], quoteValidityDays: 30, invoiceTermsDays: 14, estimatorFeeTaxCodeId: "", currency: "GBP" as const, estimatorFeeAmount: "50.00" as const, estimatorFeeInclusive: true as const };
