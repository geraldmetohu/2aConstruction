import { z } from "zod";
const title = z.string().trim().min(1).max(240);
const note = z.string().trim().max(4000).default("");
const uuid = z.string().uuid();
const ref = z.union([uuid, z.literal("")]).default("");
const amount = z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, "Use a positive amount with at most two decimal places");
const signed = z.string().regex(/^-?\d{1,9}(\.\d{1,2})?$/);
const quantity = z.string().regex(/^\d{1,9}(\.\d{1,3})?$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Invalid date");
const optionalDate = z.union([date, z.literal("")]).default("");
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const taxRate = z.string().regex(/^\d{1,3}(\.\d{1,4})?$/);
export const schemas = {
  PROJECT: z.object({ status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"]), notes: note }).strict(),
  STAGE: z.object({ name: title, weight: z.number().int().min(1).max(1000), notes: note }).strict(),
  ROOM: z.object({ name: title, notes: note }).strict(),
  TASK: z.object({ description: title, stageId: uuid, roomId: uuid, status: z.enum(["PLANNED", "ACTIVE", "BLOCKED", "COMPLETED"]), progress: z.number().int().min(0).max(100), weight: z.number().int().min(1).max(1000), variationId: ref, notes: note }).strict(),
  SCHEDULE: z.object({ taskId: uuid, start: date, end: date, workerId: ref, predecessors: z.array(uuid).max(100), notes: note }).strict(),
  MATERIAL: z.object({ requirementId: ref, taskId: uuid, description: title, unit: title, planned: quantity, ordered: quantity, received: quantity, supplier: z.string().trim().max(240), notes: note }).strict(),
  WORKER: z.object({ name: title, role: title, employmentType: z.enum(["EMPLOYEE", "SUBCONTRACTOR", "AGENCY"]), hourlyRate: amount, contact: z.string().trim().max(240), active: z.boolean(), notes: note }).strict(),
  LABOUR: z.object({ status: z.enum(["RECORDED", "VOID"]).default("RECORDED"), taskId: uuid, workerId: uuid, date, start: time, end: time, breakMinutes: z.number().int().min(0).max(1440), hourlyRate: amount, notes: note }).strict(),
  PHOTO: z.object({ assetId: uuid, title, taskId: ref, roomId: ref, stageId: ref, date, favourite: z.boolean(), portfolioCandidate: z.boolean(), notes: note }).strict(),
  DOCUMENT: z.object({ assetId: uuid, title, taskId: ref, category: z.enum(["GENERAL", "DRAWING", "CERTIFICATE", "CONTRACT", "RECEIPT"]), notes: note }).strict(),
  VARIATION: z.object({ title, description: note, requestedBy: title, status: z.enum(["PROPOSED", "APPROVED", "REJECTED"]), net: signed, vatRate: taxRate, approvedBy: z.string().trim().max(240), approvalDate: optionalDate, evidence: note }).strict(),
  SNAG: z.object({ title, description: note, roomId: uuid, taskId: ref, workerId: ref, priority: z.enum(["LOW", "MEDIUM", "HIGH"]), status: z.enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "VERIFIED"]), photoIds: z.array(uuid).max(30), resolution: note }).strict(),
  INVOICE: z.object({ title, stageId: ref, status: z.enum(["DRAFT", "ISSUED", "VOID"]), issueDate: date, dueDate: date, lines: z.array(z.object({ description: title, quantity, unitNet: amount, vatRate: taxRate }).strict()).min(1).max(100), reviewNote: note }).strict(),
  PAYMENT: z.object({ invoiceId: uuid, amount, date, method: z.enum(["BANK", "CARD", "CASH", "OTHER"]), reference: title, notes: note }).strict(),
  PAYMENT_REVERSAL: z.object({ paymentId: uuid, reason: z.string().trim().min(10).max(4000) }).strict(),
  COST: z.object({ category: z.enum(["MATERIAL", "SUPPORTING_MATERIAL", "PLANT", "WASTE", "PRELIMINARIES", "OTHER"]), supplier: title, reference: title, date, net: amount, vatRate: taxRate, status: z.enum(["RECORDED", "VOID"]), notes: note }).strict(),
};
export type Kind = keyof typeof schemas;
export type Body<K extends Kind> = z.output<(typeof schemas)[K]>;
export type Entry = { [K in Kind]: { id: string; kind: K; body: Body<K> } }[Kind];
export const commandSchema = z.object({ projectId: uuid, entityId: uuid, requestId: uuid, expectedSequence: z.number().int().min(0), kind: z.enum(Object.keys(schemas) as [Kind, ...Kind[]]), body: z.unknown(), reason: z.string().trim().min(3).max(1000) }).strict();
export function parseEntry(kind: Kind, id: string, raw: unknown): Entry { return { id, kind, body: schemas[kind].parse(raw) } as Entry; }
export class ManagementError extends Error {}
