import { z } from "zod";
export class PortalError extends Error {}
export const publicationSchema = z.object({ projectId: z.string().uuid(), expectedSequence: z.number().int().min(0), expectedPublication: z.number().int().min(0), requestId: z.string().uuid(), title: z.string().trim().min(1).max(240), introduction: z.string().trim().max(4000), shareSchedule: z.boolean(), fileIds: z.array(z.string().uuid()).max(200), variationIds: z.array(z.string().uuid()).max(200), invoiceIds: z.array(z.string().uuid()).max(200), snagIds: z.array(z.string().uuid()).max(200).default([]), status: z.enum(["SHARED", "WITHDRAWN"]), reason: z.string().trim().min(3).max(1000) }).strict();
export const messageSchema = z.object({ projectId: z.string().uuid(), requestId: z.string().uuid(), text: z.string().trim().min(1).max(4000) }).strict();
export const decisionSchema = z.object({ projectId: z.string().uuid(), publicationId: z.string().uuid(), variationId: z.string().uuid(), sourceHash: z.string().length(64), requestId: z.string().uuid(), decision: z.enum(["APPROVE", "DECLINE"]), confirmed: z.literal(true) }).strict();
export type PublicationInput = z.output<typeof publicationSchema>;
