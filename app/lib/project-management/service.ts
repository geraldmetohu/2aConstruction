import "server-only";
import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { canonicalJson } from "@/app/lib/pricing/engine";
import type { QuoteResult } from "@/app/lib/quotes/calculate";
import { commandSchema, ManagementError, parseEntry } from "./schema";
import { Base, finances, progress, replay, validateChange } from "./state";
type Db = PrismaClient | Prisma.TransactionClient;
export async function loadProject(db: Db, id: string) {
  const p = await db.deliveryProject.findUniqueOrThrow({ where: { id }, include: { baseline: true, stages: { orderBy: { position: "asc" } }, rooms: { orderBy: { position: "asc" } }, tasks: { orderBy: { position: "asc" }, include: { requirements: true } } } });
  if (!p.baseline) throw new ManagementError("The project financial baseline is missing.");
  const quote = p.quoteSnapshot as unknown as QuoteResult;
  const base: Base = { id: p.id, name: p.name, scope: p.scope as unknown as Base["scope"], baseline: p.baseline.snapshot as unknown as Base["baseline"], taxRates: [...new Set(quote.internalLines.flatMap(e => { const l = e.result.lines[0]; return l.priced ? [l.tax.rate] : []; }))], stages: p.stages.map(({ id, name }) => ({ id, name })), rooms: p.rooms.map(({ id, name }) => ({ id, name })), tasks: p.tasks.map(({ id, description, stageName, roomName }) => ({ id, description, stageName, roomName })), requirements: p.tasks.flatMap(t => t.requirements.map(({ id, taskId, kind, description, quantity, unit, supplyBy, needsReview }) => ({ id, taskId, kind, description, quantity, unit, supplyBy, needsReview }))) };
  const history = await db.projectActivity.findMany({ where: { projectId: id }, orderBy: { sequence: "asc" } });
  const state = replay(base, history);
  return { base, state, sequence: history.at(-1)?.sequence ?? 0, financials: finances(base, state), progress: progress(state), history: history.slice(-100).reverse().map(({ id, sequence, kind, entityId, reason, actorId, createdAt, body }) => ({ id, sequence, kind, entityId, reason, actorId, createdAt: createdAt.toISOString(), body })) };
}
export type Workspace = Awaited<ReturnType<typeof loadProject>>;
export type Upload = { id: string; kind: "PHOTO" | "DOCUMENT"; filename: string; mimeType: string; content: Uint8Array; sha256: string };
export function managementService(db: PrismaClient) {
  async function record(raw: unknown, actorId: string, upload?: Upload) {
    const command = commandSchema.parse(raw), entry = parseEntry(command.kind, command.entityId, command.body);
    if (Buffer.byteLength(JSON.stringify(command)) > 100000) throw new ManagementError("This entry is too large. Attach a document instead.");
    const requestHash = createHash("sha256").update(canonicalJson({ ...command, body: entry.body, ...(upload ? { assetHash: upload.sha256 } : {}) })).digest("hex");
    return db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`project-management:${command.projectId}`}))`;
      const retry = await tx.projectActivity.findUnique({ where: { projectId_requestId: { projectId: command.projectId, requestId: command.requestId } } });
      if (retry) { if (retry.requestHash !== requestHash) throw new ManagementError("This request was already used for different changes. Reload before saving."); return retry.sequence; }
      const workspace = await loadProject(tx, command.projectId);
      if (workspace.sequence !== command.expectedSequence) throw new ManagementError("Another change was saved. Reload the project before saving your changes.");
      validateChange(workspace.base, workspace.state, entry);
      if (entry.kind === "PHOTO" || entry.kind === "DOCUMENT") {
        if (upload) {
          if (upload.id !== entry.body.assetId || upload.kind !== entry.kind || upload.content.byteLength === 0 || upload.content.byteLength > 12 * 1024 * 1024) throw new ManagementError("Invalid file attachment.");
          await tx.projectAsset.create({ data: { ...upload, projectId: command.projectId, byteLength: upload.content.byteLength, actorId, content: Buffer.from(upload.content) } });
        } else if (!await tx.projectAsset.findFirst({ where: { id: entry.body.assetId, projectId: command.projectId, kind: entry.kind }, select: { id: true } })) throw new ManagementError("Choose a file attached to this project.");
      } else if (upload) throw new ManagementError("Files require a photo or document entry.");
      const next = workspace.sequence + 1;
      await tx.projectActivity.create({ data: { projectId: command.projectId, sequence: next, requestId: command.requestId, entityId: entry.id, kind: entry.kind, body: entry.body as Prisma.InputJsonValue, requestHash, reason: command.reason, actorId } });
      return next;
    }, { timeout: 60000 });
  }
  return { record };
}
