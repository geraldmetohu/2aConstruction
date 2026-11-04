// Uploaded documents for a job. Separate from the documents the system writes itself (quotation, contract, H&S pack).
import { StoreError, type Db, type Sql } from "./store";
import { addEvent } from "./jobs-store";

export const DOC_CATEGORIES = [
  ["PLANS", "Architectural plans & drawings"],
  ["STRUCTURAL", "Structural calculations"],
  ["PLANNING", "Planning / permitted development"],
  ["BUILDING_CONTROL", "Building Control"],
  ["PARTY_WALL", "Party wall"],
  ["SURVEY", "Surveys & reports"],
  ["CONTRACT", "Signed contracts & variations"],
  ["HEALTH_SAFETY", "Health & safety"],
  ["CERTIFICATE", "Certificates (electrical, gas, FENSA…)"],
  ["WARRANTY", "Warranties & manuals"],
  ["INVOICE", "Invoices & receipts"],
  ["OTHER", "Other"],
] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number][0];
export const docCategoryLabel = (c: string) => DOC_CATEGORIES.find(([k]) => k === c)?.[1] ?? "Other";

export interface JobDocument {
  id: string; quoteId: string; category: DocCategory; title: string; fileName: string; url: string; mimeType: string; sizeBytes: number;
  note: string; visibleToClient: boolean; uploadedBy: string; createdAt: Date; updatedAt: Date;
}

const COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "category", "title", "fileName", "url", "mimeType", "sizeBytes", "note", "visibleToClient", "uploadedBy", "createdAt", "updatedAt"`;

export async function documentsReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffJobDocument"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

export async function listDocuments(db: Sql, quoteId: string, clientOnly = false): Promise<JobDocument[]> {
  if (!(await documentsReady(db))) return [];
  return db.query<JobDocument>(`SELECT ${COLS} FROM "TakeoffJobDocument" WHERE "quoteId" = $1::uuid AND NOT "hidden" ${clientOnly ? `AND "visibleToClient"` : ""} ORDER BY "createdAt" DESC`, [quoteId]);
}

export async function addDocuments(db: Db, quoteId: string, docs: { url: string; fileName: string; mimeType: string; sizeBytes: number; category: DocCategory; title?: string; visibleToClient?: boolean }[], actor: string) {
  if (!(await documentsReady(db))) throw new StoreError("Documents need the new database table (migration 20261104120000_add_job_documents).");
  return db.transaction(async tx => {
    for (const d of docs) {
      if (!/^https:\/\/[^\s]+$/.test(d.url)) throw new StoreError("Documents must be uploaded files (https links).");
      const title = (d.title?.trim() || d.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Document").slice(0, 200);
      await tx.query(`INSERT INTO "TakeoffJobDocument" ("quoteId", "category", "title", "fileName", "url", "mimeType", "sizeBytes", "visibleToClient", "uploadedBy")
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::int, $8::boolean, $9) RETURNING "id"`,
        [quoteId, d.category, title, d.fileName.slice(0, 300), d.url, d.mimeType.slice(0, 120), Math.max(0, Math.min(2_000_000_000, Math.round(d.sizeBytes))), !!d.visibleToClient, actor]);
    }
    const shared = docs.filter(d => d.visibleToClient).length;
    await addEvent(tx, quoteId, "DOCUMENT", `${docs.length} document${docs.length === 1 ? "" : "s"} added (${docCategoryLabel(docs[0]?.category ?? "OTHER")}).`, "ADMIN", actor, false);
    if (shared) await addEvent(tx, quoteId, "DOCUMENT", `${shared} new document${shared === 1 ? "" : "s"} shared with you.`, "ADMIN", actor, true);
  });
}

export async function updateDocument(db: Db, quoteId: string, id: string, patch: { title?: string; category?: DocCategory; note?: string; visibleToClient?: boolean; hidden?: boolean }, actor: string) {
  return db.transaction(async tx => {
    const [cur] = await tx.query<JobDocument & { hidden: boolean }>(`SELECT ${COLS}, "hidden" FROM "TakeoffJobDocument" WHERE "id" = $1::uuid AND "quoteId" = $2::uuid`, [id, quoteId]);
    if (!cur) throw new StoreError("Document not found.");
    const n = { title: (patch.title ?? cur.title).trim().slice(0, 200) || cur.title, category: patch.category ?? cur.category, note: (patch.note ?? cur.note).slice(0, 1000), visibleToClient: patch.visibleToClient ?? cur.visibleToClient, hidden: patch.hidden ?? cur.hidden };
    await tx.query(`UPDATE "TakeoffJobDocument" SET "title" = $2, "category" = $3, "note" = $4, "visibleToClient" = $5::boolean, "hidden" = $6::boolean, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`,
      [id, n.title, n.category, n.note, n.visibleToClient && !n.hidden, n.hidden]);
    if (n.visibleToClient && !cur.visibleToClient && !n.hidden) await addEvent(tx, quoteId, "DOCUMENT", `Document shared with you: ${n.title}.`, "ADMIN", actor, true);
  });
}
