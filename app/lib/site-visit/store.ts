// Site visit storage (migration 20261125120000_site_visits). Plain parameterised SQL behind the same small
// interface as the quote and job stores, so it runs on Prisma in the app and on in-memory Postgres in the tests.
import { StoreError, type Db, type Sql } from "../takeoff/store";
import { cleanTakeoff, type VisitTakeoff } from "./convert";
import { PROJECT_TYPES, cleanAnswers, type Answers } from "./template";

export type VisitStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "QUOTED" | "CANCELLED";
export const VISIT_STATUSES: [VisitStatus, string][] = [["PLANNED", "Planned"], ["IN_PROGRESS", "On site"], ["DONE", "Visit done"], ["QUOTED", "Quoted"], ["CANCELLED", "Cancelled"]];

export interface VisitRow {
  id: string; reference: string; status: VisitStatus;
  clientName: string; clientEmail: string; clientPhone: string; siteAddress: string; postcode: string;
  visitAt: Date | null; projectTypes: string[]; answers: Answers; takeoff: VisitTakeoff; version: number;
  quoteId: string | null; quoteReference: string | null; createdBy: string; createdAt: Date; updatedAt: Date;
}
export interface VisitDetails { clientName: string; clientEmail: string; clientPhone: string; siteAddress: string; postcode: string; visitAt: string | null; projectTypes: string[] }

const COLS = `v."id"::text AS "id", v."reference", v."status", v."clientName", v."clientEmail", v."clientPhone", v."siteAddress", v."postcode",
  v."visitAt", v."projectTypes", v."answers", v."takeoff", v."version", v."quoteId"::text AS "quoteId", q."reference" AS "quoteReference",
  v."createdBy", v."createdAt", v."updatedAt"`;
const FROM = `"SiteVisit" v LEFT JOIN "TakeoffQuote" q ON q."id" = v."quoteId"`;
const shape = (r: VisitRow): VisitRow => ({ ...r, answers: cleanAnswers(r.answers), takeoff: cleanTakeoff(r.takeoff), projectTypes: r.projectTypes ?? [] });

export async function visitsReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"SiteVisit"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}
async function need(db: Sql) { if (!(await visitsReady(db))) throw new StoreError("Site visits need the database update 20261125120000_site_visits (npx prisma migrate deploy)."); }

export const knownTypes = (types: string[]) => [...new Set(types)].filter(t => PROJECT_TYPES.some(p => p.id === t)).slice(0, 10);

export async function createVisit(db: Db, d: VisitDetails, answers: Answers, takeoff: VisitTakeoff, actor: string) {
  await need(db);
  return db.transaction(async tx => {
    const year = new Date().getUTCFullYear();
    const [{ n }] = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM "SiteVisit" WHERE "reference" LIKE $1`, [`SV-${year}-%`]);
    let ref = "", seq = n + 1;
    for (let i = 0; i < 20; i++, seq++) {
      ref = `SV-${year}-${String(seq).padStart(4, "0")}`;
      const [taken] = await tx.query(`SELECT 1 FROM "SiteVisit" WHERE "reference" = $1`, [ref]);
      if (!taken) break;
    }
    const [row] = await tx.query<{ id: string }>(`INSERT INTO "SiteVisit" ("reference", "clientName", "clientEmail", "clientPhone", "siteAddress", "postcode", "visitAt", "projectTypes", "answers", "takeoff", "createdBy")
      VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::text[], $9::jsonb, $10::jsonb, $11) RETURNING "id"::text AS id`,
      [ref, d.clientName, d.clientEmail.trim().toLowerCase(), d.clientPhone, d.siteAddress, d.postcode, d.visitAt, knownTypes(d.projectTypes), JSON.stringify(answers), JSON.stringify(takeoff), actor]);
    return { id: row.id, reference: ref };
  });
}

export async function listVisits(db: Sql, opts: { limit?: number; status?: VisitStatus | "OPEN" } = {}): Promise<VisitRow[]> {
  if (!(await visitsReady(db))) return [];
  const where = opts.status === "OPEN" ? `WHERE v."status" IN ('PLANNED', 'IN_PROGRESS', 'DONE')` : opts.status ? `WHERE v."status" = $2` : "";
  const params: unknown[] = [Math.min(opts.limit ?? 200, 500)];
  if (opts.status && opts.status !== "OPEN") params.push(opts.status);
  const rows = await db.query<VisitRow>(`SELECT ${COLS} FROM ${FROM} ${where} ORDER BY v."visitAt" DESC NULLS FIRST, v."createdAt" DESC LIMIT $1`, params);
  return rows.map(shape);
}

export async function getVisit(db: Sql, id: string): Promise<VisitRow | null> {
  if (!(await visitsReady(db))) return null;
  const [r] = await db.query<VisitRow>(`SELECT ${COLS} FROM ${FROM} WHERE v."id" = $1::uuid`, [id]);
  return r ? shape(r) : null;
}

/** Save the form. `expectedVersion` stops two devices overwriting each other. */
export async function saveVisit(db: Db, id: string, expectedVersion: number, d: VisitDetails, answers: Answers, takeoff: VisitTakeoff) {
  await need(db);
  return db.transaction(async tx => {
    const [cur] = await tx.query<{ version: number; status: VisitStatus }>(`SELECT "version", "status" FROM "SiteVisit" WHERE "id" = $1::uuid FOR UPDATE`, [id]);
    if (!cur) throw new StoreError("That site visit was not found.");
    if (cur.version !== expectedVersion) throw new StoreError("This visit was changed on another device. Reload the page to get the latest version – your last changes are kept on this device.");
    const [r] = await tx.query<{ version: number }>(`UPDATE "SiteVisit" SET "clientName" = $2, "clientEmail" = $3, "clientPhone" = $4, "siteAddress" = $5, "postcode" = $6,
      "visitAt" = $7::timestamptz, "projectTypes" = $8::text[], "answers" = $9::jsonb, "takeoff" = $10::jsonb, "version" = "version" + 1, "updatedAt" = now()
      WHERE "id" = $1::uuid RETURNING "version"`,
      [id, d.clientName, d.clientEmail.trim().toLowerCase(), d.clientPhone, d.siteAddress, d.postcode, d.visitAt, knownTypes(d.projectTypes), JSON.stringify(answers), JSON.stringify(takeoff)]);
    return { version: r.version };
  });
}

export async function setVisitStatus(db: Sql, id: string, status: VisitStatus) {
  await need(db);
  const r = await db.query(`UPDATE "SiteVisit" SET "status" = $2, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING 1`, [id, status]);
  if (!r.length) throw new StoreError("That site visit was not found.");
}

/** The quote made from this visit (the first one is kept if a second is made). */
export async function linkVisitQuote(db: Sql, id: string, quoteId: string) {
  await need(db);
  const r = await db.query(`UPDATE "SiteVisit" SET "quoteId" = COALESCE("quoteId", $2::uuid), "status" = 'QUOTED', "updatedAt" = now() WHERE "id" = $1::uuid RETURNING 1`, [id, quoteId]);
  if (!r.length) throw new StoreError("That site visit was not found.");
}
