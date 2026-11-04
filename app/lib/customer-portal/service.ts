import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { loadProject } from "@/app/lib/project-management/service";
import { entries, validateChange } from "@/app/lib/project-management/state";
import { parseEntry } from "@/app/lib/project-management/schema";
import type { QuoteResult } from "@/app/lib/quotes/calculate";
import { decisionSchema, messageSchema, publicationSchema, PortalError } from "./schema";
import { hash, projectForCustomer, PublicProject } from "./projection";
type Db = PrismaClient | Prisma.TransactionClient;
const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v));
export async function ownedProject(db: Db, projectId: string, ownerId: string) {
  z.string().uuid().parse(projectId);
  const project = await db.deliveryProject.findFirst({ where: { id: projectId, client: { ownerId } }, select: { id: true } });
  if (!project) throw new PortalError("This project is not available.");
}
export async function currentPublication(db: Db, projectId: string) {
  return db.customerPublication.findFirst({ where: { projectId }, orderBy: { version: "desc" } });
}
export async function readCustomerProject(db: Db, projectId: string, ownerId: string) {
  await ownedProject(db, projectId, ownerId);
  const publication = await currentPublication(db, projectId);
  if (!publication || publication.status !== "SHARED") return null;
  const messages = await db.customerMessage.findMany({ where: { projectId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, authorKind: true, text: true, createdAt: true } });
  const decisions = await db.customerDecision.findMany({ where: { projectId }, select: { variationId: true, sourceHash: true, decision: true, createdAt: true } });
  return { publicationId: publication.id, version: publication.version, updatedAt: publication.createdAt.toISOString(), project: publication.snapshot as unknown as PublicProject, messages: messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })), decisions: decisions.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })) };
}
export type CustomerView = NonNullable<Awaited<ReturnType<typeof readCustomerProject>>>;
export function portalService(db: PrismaClient) {
  async function publish(raw: unknown, actorId: string) {
    const input = publicationSchema.parse(raw), requestHash = hash(input);
    return db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`project-management:${input.projectId}`}))`;
      const retry = await tx.customerPublication.findUnique({ where: { projectId_requestId: { projectId: input.projectId, requestId: input.requestId } } });
      if (retry) { if (retry.requestHash !== requestHash) throw new PortalError("This publication request already contains different changes."); return retry.id; }
      const current = await currentPublication(tx, input.projectId), w = await loadProject(tx, input.projectId);
      if ((current?.version ?? 0) !== input.expectedPublication || w.sequence !== input.expectedSequence) throw new PortalError("The project or shared update changed. Reload and review before publishing.");
      const p = await tx.deliveryProject.findUniqueOrThrow({ where: { id: input.projectId }, select: { quoteSnapshot: true, scope: true } });
      const files = await tx.projectAsset.findMany({ where: { projectId: input.projectId, id: { in: input.fileIds } }, select: { id: true, kind: true, mimeType: true, filename: true, byteLength: true } });
      const snapshot = input.status === "WITHDRAWN" ? {} : projectForCustomer(w, input, (p.quoteSnapshot as unknown as QuoteResult).customer, (p.scope as { approvedLineKeys: string[] }).approvedLineKeys, files);
      return (await tx.customerPublication.create({ data: { projectId: input.projectId, version: (current?.version ?? 0) + 1, requestId: input.requestId, requestHash, status: input.status, snapshot: json(snapshot), publishedBy: actorId, reason: input.reason } })).id;
    }, { timeout: 60000 });
  }
  async function message(raw: unknown, actorId: string, authorKind: "CUSTOMER" | "ADMIN") {
    const input = messageSchema.parse(raw);
    return db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`project-management:${input.projectId}`}))`;
      if (authorKind === "CUSTOMER") await ownedProject(tx, input.projectId, actorId);
      else await tx.deliveryProject.findUniqueOrThrow({ where: { id: input.projectId }, select: { id: true } });
      const current = await currentPublication(tx, input.projectId); if (!current || current.status !== "SHARED") throw new PortalError("Messaging is available when a project update is shared.");
      const retry = await tx.customerMessage.findUnique({ where: { authorId_requestId: { authorId: actorId, requestId: input.requestId } } });
      if (retry) { if (retry.projectId !== input.projectId || retry.text !== input.text || retry.authorKind !== authorKind) throw new PortalError("This message request was already used."); return retry.id; }
      return (await tx.customerMessage.create({ data: { projectId: input.projectId, requestId: input.requestId, authorId: actorId, authorKind, text: input.text } })).id;
    });
  }
  async function decide(raw: unknown, ownerId: string) {
    const input = decisionSchema.parse(raw);
    return db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`project-management:${input.projectId}`}))`;
      await ownedProject(tx, input.projectId, ownerId);
      const previous = await tx.customerDecision.findUnique({ where: { actorId_requestId: { actorId: ownerId, requestId: input.requestId } } });
      if (previous) { if (previous.projectId !== input.projectId || previous.publicationId !== input.publicationId || previous.variationId !== input.variationId || previous.sourceHash !== input.sourceHash || previous.decision !== input.decision) throw new PortalError("This decision request was already used."); return previous.id; }
      const publication = await currentPublication(tx, input.projectId);
      if (!publication || publication.id !== input.publicationId || publication.status !== "SHARED") throw new PortalError("The shared project update changed. Reload before deciding.");
      const offered = (publication.snapshot as unknown as PublicProject).variations.find(v => v.id === input.variationId && v.sourceHash === input.sourceHash && v.status === "PROPOSED");
      if (!offered) throw new PortalError("This proposal is not available for a decision.");
      const already = await tx.customerDecision.findUnique({ where: { projectId_variationId_sourceHash: { projectId: input.projectId, variationId: input.variationId, sourceHash: input.sourceHash } } });
      if (already) { if (already.decision !== input.decision) throw new PortalError("A decision is already recorded. Contact the project team to change the agreed scope."); return already.id; }
      const w = await loadProject(tx, input.projectId), variation = entries(w.state, "VARIATION").find(v => v.id === input.variationId);
      if (!variation || variation.body.status !== "PROPOSED" || hash(variation.body) !== input.sourceHash) throw new PortalError("The proposal has changed. Ask the project team for a fresh update.");
      const body = { ...variation.body, status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED", approvedBy: input.decision === "APPROVE" ? ownerId : "", approvalDate: input.decision === "APPROVE" ? new Date().toISOString().slice(0, 10) : "", evidence: `Customer portal ${input.decision.toLowerCase()} of publication ${publication.id}; proposal ${input.sourceHash}` };
      const change = parseEntry("VARIATION", variation.id, body); validateChange(w.base, w.state, change);
      const decision = await tx.customerDecision.create({ data: { projectId: input.projectId, publicationId: publication.id, variationId: variation.id, sourceHash: input.sourceHash, decision: input.decision, actorId: ownerId, requestId: input.requestId } });
      // Append an operational event; no existing variation/history row is updated.
      await tx.projectActivity.create({ data: { projectId: input.projectId, sequence: w.sequence + 1, requestId: input.requestId, entityId: variation.id, kind: "VARIATION", body: json(change.body), requestHash: hash(input), reason: `Customer portal decision ${decision.id}`, actorId: ownerId } });
      return decision.id;
    }, { timeout: 60000 });
  }
  return { publish, message, decide };
}
