import "server-only";
import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { canonicalJson } from "@/app/lib/pricing/engine";
import { quoteDocumentSchema } from "@/app/lib/quotes/schema";
import { conversionSchema, ConversionError, projectPlan } from "./plan";
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

export function deliveryService(db: PrismaClient) {
  async function convert(raw: unknown, actor: string) {
    const input = conversionSchema.parse(raw);
    return db.$transaction(async tx => {
      // Same quote lock as quote editing/release; concurrent conversions and edits serialize.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quote:${input.quoteId}`}))`;
      const existing = await tx.acceptedQuote.findUnique({ where: { quoteId: input.quoteId }, include: { project: true } });
      if (existing) {
        if (existing.revisionId !== input.revisionId) throw new ConversionError("This quote already has a project from another revision. Use the existing project and variation workflow.");
        if (canonicalJson([...(existing.approvedOptionalKeys as string[])].sort()) !== canonicalJson([...input.approvedOptionalKeys].sort())) throw new ConversionError("This quote was already converted with different optional approvals. Open the existing project to review its baseline.");
        if (!existing.project) throw new ConversionError("The acceptance has no project. It needs an administrator's review.");
        return existing.project.id;
      }
      const revision = await tx.quoteRevision.findFirstOrThrow({ where: { quoteId: input.quoteId }, orderBy: { version: "desc" }, include: { quote: true, release: true } });
      if (revision.id !== input.revisionId) throw new ConversionError("The quote changed. Reload and review the latest revision before conversion.");
      if (!revision.release) throw new ConversionError("Release this saved quote before recording customer acceptance.");
      const document = quoteDocumentSchema.parse(revision.document);
      const acceptedAt = new Date(input.acceptedAt);
      if (acceptedAt.getTime() > Date.now() || acceptedAt < revision.release.createdAt || acceptedAt.toISOString().slice(0, 10) > document.validUntil) throw new ConversionError("Acceptance must be after release, within quote validity, and not in the future.");
      const plan = projectPlan(revision.result, revision.snapshotHash, input.approvedOptionalKeys);
      const email = document.customerEmail.trim().toLowerCase();
      // A single identity-resolution lock prevents separate quote conversions creating duplicate clients.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('delivery-client-resolution'))`;
      const matches = await tx.client.findMany({ where: { OR: [{ userId: revision.quote.ownerId }, { email: { equals: email, mode: "insensitive" } }] }, select: { id: true, userId: true, fullName: true, email: true, phone: true, address: true } });
      if (input.existingClientId && !matches.some(c => c.id === input.existingClientId)) throw new ConversionError("The selected client does not match this quote's account or email.");
      let client = await tx.deliveryClient.findUnique({ where: { ownerId: revision.quote.ownerId } });
      if (!client && matches.length > 1 && !input.existingClientId) throw new ConversionError("Several existing client records match. Select the correct one; no client was created.");
      const legacy = matches.find(c => c.id === input.existingClientId) ?? (matches.length === 1 ? matches[0] : undefined);
      if (client && input.existingClientId && client.legacyClientId !== input.existingClientId) throw new ConversionError("This account is already linked to another client. Review the identity before conversion.");
      if (!client) {
        const byIdentity = await tx.deliveryClient.findFirst({ where: { OR: [{ normalizedEmail: email }, ...(legacy ? [{ legacyClientId: legacy.id }] : [])] } });
        if (byIdentity && byIdentity.ownerId !== revision.quote.ownerId) throw new ConversionError("This client already belongs to another account. Resolve the identity before conversion; no duplicate was created.");
        client = byIdentity ?? await tx.deliveryClient.create({ data: { ownerId: revision.quote.ownerId, legacyClientId: legacy?.id, normalizedEmail: email, name: legacy?.fullName ?? document.customerName, contactSnapshot: json(legacy ?? { name: document.customerName, email: document.customerEmail, address: document.address }) } });
      }
      const acceptance = await tx.acceptedQuote.create({ data: { quoteId: input.quoteId, revisionId: revision.id, snapshotHash: revision.snapshotHash, acceptedBy: input.acceptedBy, acceptedAt, evidence: input.evidence, approvedOptionalKeys: input.approvedOptionalKeys, recordedBy: actor } });
      const project = await tx.deliveryProject.create({ data: { acceptanceId: acceptance.id, clientId: client.id, name: input.projectName, scope: json(plan.scope), quoteSnapshot: revision.result as Prisma.InputJsonValue, planHash: createHash("sha256").update(canonicalJson(plan)).digest("hex"), createdBy: actor } });
      await tx.deliveryStage.createMany({ data: plan.stages.map((name, position) => ({ projectId: project.id, name, position })) });
      await tx.deliveryRoom.createMany({ data: plan.rooms.map((name, position) => ({ projectId: project.id, name, position })) });
      for (const task of plan.tasks) {
        await tx.deliveryTask.create({ data: { projectId: project.id, quoteLineKey: task.key, stageName: task.stage, roomName: task.room, section: task.section, description: task.description, position: task.order, snapshot: json(task.snapshot), requirements: { create: task.requirements.map(r => ({ ...r, snapshot: json(r.snapshot) })) } } });
      }
      await tx.deliveryBaseline.create({ data: { projectId: project.id, snapshot: json(plan.baseline) } });
      return project.id;
    }, { timeout: 60000 });
  }
  return { convert };
}
