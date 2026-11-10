// Storage for saved takeoff quotes, versions, client notices/choices, company
// rate sets and supplier prices. Plain parameterised SQL behind a tiny interface
// so it works with Prisma ($queryRawUnsafe) and is testable on in-memory Postgres.

export interface Sql { query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> }
export interface Db extends Sql { transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T> }

export class StoreError extends Error {}

type PrismaLike = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $transaction<T>(fn: (tx: { $queryRawUnsafe<R = unknown>(query: string, ...values: unknown[]): Promise<R> }) => Promise<T>, options?: { timeout?: number }): Promise<T>;
};
export function prismaDb(prisma: PrismaLike): Db {
  const wrap = (c: { $queryRawUnsafe<R = unknown>(query: string, ...values: unknown[]): Promise<R> }): Sql => ({
    query: async <T,>(text: string, params: unknown[] = []) => (await c.$queryRawUnsafe<T[]>(text, ...params)),
  });
  return { ...wrap(prisma), transaction: fn => prisma.$transaction(tx => fn(wrap(tx)), { timeout: 30000 }) };
}

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED";
export interface QuoteRow {
  id: string; reference: string; clientName: string; clientEmail: string; siteAddress: string; status: QuoteStatus;
  currentVersion: number; publishedVersion: number | null; sentAt: Date | null; acceptedAt: Date | null; acceptedName: string | null;
  createdBy: string; createdAt: Date; updatedAt: Date;
}
export interface VersionPayload { input: unknown; result: unknown; customer: unknown; rates: unknown; prices: unknown }
export interface VersionRow extends VersionPayload { version: number; reason: string; visibleToClient: boolean; createdBy: string; createdAt: Date }
export interface EventRow { id: string; version: number; kind: string; message: string; actor: string; actorKind: "ADMIN" | "CLIENT"; createdAt: Date }

const QUOTE_COLS = `"id"::text AS "id", "reference", "clientName", "clientEmail", "siteAddress", "status", "currentVersion", "publishedVersion", "sentAt", "acceptedAt", "acceptedName", "createdBy", "createdAt", "updatedAt"`;
const json = (v: unknown) => JSON.stringify(v ?? null);
const email = (e: string) => e.trim().toLowerCase();

export async function storageReady(db: Sql): Promise<boolean> {
  try {
    const [row] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffQuote"') IS NOT NULL AS ok`);
    return !!row?.ok;
  } catch { return false; }
}

function newReference(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  const r = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `Q-${d}-${r}`;
}

async function event(tx: Sql, quoteId: string, version: number, kind: string, message: string, actor: string, actorKind: "ADMIN" | "CLIENT") {
  await tx.query(`INSERT INTO "TakeoffQuoteEvent" ("quoteId", "version", "kind", "message", "actor", "actorKind") VALUES ($1::uuid, $2::int, $3, $4, $5, $6) RETURNING "id"`,
    [quoteId, version, kind, message, actor, actorKind]);
}

async function insertVersion(tx: Sql, quoteId: string, version: number, p: VersionPayload, reason: string, actor: string, visible: boolean) {
  await tx.query(`INSERT INTO "TakeoffQuoteVersion" ("quoteId", "version", "input", "result", "customer", "rates", "prices", "reason", "visibleToClient", "createdBy")
    VALUES ($1::uuid, $2::int, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9::boolean, $10) RETURNING "id"`,
    [quoteId, version, json(p.input), json(p.result), json(p.customer), json(p.rates), json(p.prices), reason, visible, actor]);
}

// ---------------------------------------------------------------- Admin

export async function createQuote(db: Db, client: { clientName: string; clientEmail: string; siteAddress: string }, payload: VersionPayload, actor: string) {
  return db.transaction(async tx => {
    let ref = newReference();
    for (let i = 0; i < 5; i++) {
      const [taken] = await tx.query(`SELECT 1 FROM "TakeoffQuote" WHERE "reference" = $1`, [ref]);
      if (!taken) break; ref = newReference();
    }
    const [q] = await tx.query<{ id: string }>(`INSERT INTO "TakeoffQuote" ("reference", "clientName", "clientEmail", "siteAddress", "createdBy") VALUES ($1, $2, $3, $4, $5) RETURNING "id"::text AS "id"`,
      [ref, client.clientName, email(client.clientEmail), client.siteAddress, actor]);
    await insertVersion(tx, q.id, 1, payload, "First version", actor, false);
    await event(tx, q.id, 1, "CREATED", "Quote created", actor, "ADMIN");
    return { id: q.id, reference: ref, version: 1 };
  });
}

/**
 * Save a new version. Draft: just saved. Already sent: the new version becomes the
 * client's version straight away and the client sees an "updated" notice in their portal.
 */
export async function saveVersion(db: Db, quoteId: string, expectedVersion: number, client: { clientName: string; clientEmail: string; siteAddress: string }, payload: VersionPayload, reason: string, actor: string) {
  return db.transaction(async tx => {
    const [q] = await tx.query<QuoteRow>(`SELECT ${QUOTE_COLS} FROM "TakeoffQuote" WHERE "id" = $1::uuid FOR UPDATE`, [quoteId]);
    if (!q) throw new StoreError("Quote not found.");
    if (q.currentVersion !== expectedVersion) throw new StoreError(`Someone saved version ${q.currentVersion} after you opened version ${expectedVersion}. Reload before saving.`);
    if (q.status === "ACCEPTED") throw new StoreError("This quote has been accepted by the client. Create a new quote or a variation instead.");
    const next = q.currentVersion + 1, sent = q.status === "SENT";
    await insertVersion(tx, quoteId, next, payload, reason, actor, sent);
    await tx.query(`UPDATE "TakeoffQuote" SET "currentVersion" = $2::int, "publishedVersion" = CASE WHEN $3::boolean THEN $2::int ELSE "publishedVersion" END,
      "clientName" = $4, "clientEmail" = $5, "siteAddress" = $6, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`,
      [quoteId, next, sent, client.clientName, email(client.clientEmail), client.siteAddress]);
    await event(tx, quoteId, next, sent ? "UPDATED_AFTER_SEND" : "SAVED", sent ? `Quote updated: ${reason}` : reason, actor, "ADMIN");
    return { version: next, notified: sent, reference: q.reference };
  });
}

/** Make the latest version visible to the client in their portal. */
export async function sendQuote(db: Db, quoteId: string, actor: string) {
  return db.transaction(async tx => {
    const [q] = await tx.query<QuoteRow>(`SELECT ${QUOTE_COLS} FROM "TakeoffQuote" WHERE "id" = $1::uuid FOR UPDATE`, [quoteId]);
    if (!q) throw new StoreError("Quote not found.");
    if (q.status === "ACCEPTED") throw new StoreError("This quote has already been accepted.");
    const who = { reference: q.reference, clientName: q.clientName, clientEmail: q.clientEmail };
    if (q.publishedVersion === q.currentVersion && q.status === "SENT") return { version: q.currentVersion, already: true, ...who };
    await tx.query(`UPDATE "TakeoffQuote" SET "status" = 'SENT', "publishedVersion" = "currentVersion", "sentAt" = COALESCE("sentAt", now()), "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [quoteId]);
    await event(tx, quoteId, q.currentVersion, "SENT", `Quote version ${q.currentVersion} sent to ${q.clientEmail}`, actor, "ADMIN");
    return { version: q.currentVersion, already: false, ...who };
  });
}

export async function listQuotes(db: Sql, limit = 100) {
  return db.query<QuoteRow & { gross: number | null; unread: number }>(`
    SELECT ${QUOTE_COLS.split(", ").map(c => c.startsWith('"id"') ? `q."id"::text AS "id"` : `q.${c}`).join(", ")},
      (v."result" -> 'totals' ->> 'gross')::float8 AS "gross",
      (SELECT count(*)::int FROM "TakeoffQuoteEvent" e WHERE e."quoteId" = q."id" AND e."actorKind" = 'CLIENT'
        AND e."createdAt" > COALESCE((SELECT max(s."seenAt") FROM "TakeoffQuoteSeen" s WHERE s."quoteId" = q."id" AND s."viewer" = 'ADMIN'), 'epoch')) AS "unread"
    FROM "TakeoffQuote" q JOIN "TakeoffQuoteVersion" v ON v."quoteId" = q."id" AND v."version" = q."currentVersion"
    ORDER BY q."updatedAt" DESC LIMIT $1::int`, [limit]);
}

export async function getQuote(db: Sql, quoteId: string) {
  const [quote] = await db.query<QuoteRow>(`SELECT ${QUOTE_COLS} FROM "TakeoffQuote" WHERE "id" = $1::uuid`, [quoteId]);
  if (!quote) return null;
  const [latest] = await db.query<VersionRow>(`SELECT "version", "input", "result", "customer", "rates", "prices", "reason", "visibleToClient", "createdBy", "createdAt" FROM "TakeoffQuoteVersion" WHERE "quoteId" = $1::uuid AND "version" = $2::int`, [quoteId, quote.currentVersion]);
  const versions = await db.query<{ version: number; reason: string; visibleToClient: boolean; createdBy: string; createdAt: Date; gross: number | null }>(
    `SELECT "version", "reason", "visibleToClient", "createdBy", "createdAt", ("result" -> 'totals' ->> 'gross')::float8 AS "gross" FROM "TakeoffQuoteVersion" WHERE "quoteId" = $1::uuid ORDER BY "version" DESC`, [quoteId]);
  const events = await db.query<EventRow>(`SELECT "id"::text AS "id", "version", "kind", "message", "actor", "actorKind", "createdAt" FROM "TakeoffQuoteEvent" WHERE "quoteId" = $1::uuid ORDER BY "createdAt" DESC, "id" DESC LIMIT 200`, [quoteId]);
  return { quote, latest, versions, events };
}

export async function getVersion(db: Sql, quoteId: string, version: number) {
  const [v] = await db.query<VersionRow>(`SELECT "version", "input", "result", "customer", "rates", "prices", "reason", "visibleToClient", "createdBy", "createdAt" FROM "TakeoffQuoteVersion" WHERE "quoteId" = $1::uuid AND "version" = $2::int`, [quoteId, version]);
  return v ?? null;
}

export async function markSeen(db: Sql, quoteId: string, viewer: "ADMIN" | "CLIENT") {
  await db.query(`INSERT INTO "TakeoffQuoteSeen" ("quoteId", "viewer") VALUES ($1::uuid, $2) RETURNING "id"`, [quoteId, viewer]);
}

// ---------------------------------------------------------------- Client portal

/** Quotes sent to this email address (case-insensitive). Drafts are never visible. */
export async function listClientQuotes(db: Sql, clientEmail: string) {
  return db.query<{ id: string; reference: string; siteAddress: string; status: QuoteStatus; publishedVersion: number; gross: number | null; updatedAt: Date; unseen: number }>(`
    SELECT q."id"::text AS "id", q."reference", q."siteAddress", q."status", q."publishedVersion", q."updatedAt",
      (v."customer" ->> 'gross')::float8 AS "gross",
      (SELECT count(*)::int FROM "TakeoffQuoteEvent" e WHERE e."quoteId" = q."id" AND e."kind" IN ('SENT', 'UPDATED_AFTER_SEND')
        AND e."createdAt" > COALESCE((SELECT max(s."seenAt") FROM "TakeoffQuoteSeen" s WHERE s."quoteId" = q."id" AND s."viewer" = 'CLIENT'), 'epoch')) AS "unseen"
    FROM "TakeoffQuote" q JOIN "TakeoffQuoteVersion" v ON v."quoteId" = q."id" AND v."version" = q."publishedVersion"
    WHERE q."clientEmail" = $1 AND q."publishedVersion" IS NOT NULL AND q."status" <> 'DRAFT'
    ORDER BY q."updatedAt" DESC`, [email(clientEmail)]);
}

/** The quote layout each client had last (so a new quote for them starts the same way). Read-only. */
export async function clientQuoteFormats(db: Sql) {
  const rows = await db.query<{ email: string; format: string | null; groupBy: string | null }>(`
    SELECT DISTINCT ON (q."clientEmail") q."clientEmail" AS "email", v."input" -> 'terms' ->> 'format' AS "format", v."input" -> 'terms' ->> 'groupBy' AS "groupBy"
    FROM "TakeoffQuote" q JOIN "TakeoffQuoteVersion" v ON v."quoteId" = q."id" AND v."version" = q."currentVersion"
    WHERE q."clientEmail" <> '' ORDER BY q."clientEmail", q."updatedAt" DESC LIMIT 2000`);
  return Object.fromEntries(rows.filter(r => r.format).map(r => [r.email.toLowerCase(), { format: r.format!, groupBy: r.groupBy ?? "AREA" }]));
}

export async function getClientQuote(db: Sql, quoteId: string, clientEmail: string) {
  const [quote] = await db.query<QuoteRow>(`SELECT ${QUOTE_COLS} FROM "TakeoffQuote" WHERE "id" = $1::uuid AND "clientEmail" = $2 AND "publishedVersion" IS NOT NULL AND "status" <> 'DRAFT'`, [quoteId, email(clientEmail)]);
  if (!quote) return null;
  const version = await getVersion(db, quoteId, quote.publishedVersion!);
  const [seen] = await db.query<{ at: Date | null }>(`SELECT max("seenAt") AS "at" FROM "TakeoffQuoteSeen" WHERE "quoteId" = $1::uuid AND "viewer" = 'CLIENT'`, [quoteId]);
  const updates = await db.query<EventRow>(`SELECT "id"::text AS "id", "version", "kind", "message", "actor", "actorKind", "createdAt" FROM "TakeoffQuoteEvent"
    WHERE "quoteId" = $1::uuid AND "kind" IN ('SENT', 'UPDATED_AFTER_SEND', 'CLIENT_CHOICE', 'ACCEPTED') ORDER BY "createdAt" DESC LIMIT 50`, [quoteId]);
  const lastSeen = seen?.at ? new Date(seen.at).getTime() : 0;
  return { quote, version, updates, unseen: updates.filter(u => u.kind === "UPDATED_AFTER_SEND" && new Date(u.createdAt).getTime() > lastSeen) };
}

/** Client confirms their choices: a new published version priced with them. */
export async function saveClientChoices(db: Db, quoteId: string, clientEmail: string, expectedVersion: number, payload: VersionPayload, summary: string) {
  return db.transaction(async tx => {
    const [q] = await tx.query<QuoteRow>(`SELECT ${QUOTE_COLS} FROM "TakeoffQuote" WHERE "id" = $1::uuid AND "clientEmail" = $2 FOR UPDATE`, [quoteId, email(clientEmail)]);
    if (!q || q.status !== "SENT") throw new StoreError("This quote can no longer be changed online. Please contact us.");
    if (q.currentVersion !== expectedVersion || q.publishedVersion !== expectedVersion) throw new StoreError("The quote has just been updated. Please reload and check your choices again.");
    const next = q.currentVersion + 1;
    await insertVersion(tx, quoteId, next, payload, `Client choices: ${summary}`, `client:${email(clientEmail)}`, true);
    await tx.query(`UPDATE "TakeoffQuote" SET "currentVersion" = $2::int, "publishedVersion" = $2::int, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [quoteId, next]);
    await event(tx, quoteId, next, "CLIENT_CHOICE", summary, email(clientEmail), "CLIENT");
    return { version: next };
  });
}

export async function acceptQuote(db: Db, quoteId: string, clientEmail: string, version: number, fullName: string) {
  return db.transaction(async tx => {
    const [q] = await tx.query<QuoteRow>(`SELECT ${QUOTE_COLS} FROM "TakeoffQuote" WHERE "id" = $1::uuid AND "clientEmail" = $2 FOR UPDATE`, [quoteId, email(clientEmail)]);
    if (!q || q.status !== "SENT") throw new StoreError("This quote cannot be accepted online. Please contact us.");
    if (q.publishedVersion !== version) throw new StoreError("The quote has been updated since you opened it. Please review the latest version.");
    await tx.query(`UPDATE "TakeoffQuote" SET "status" = 'ACCEPTED', "acceptedAt" = now(), "acceptedName" = $2, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [quoteId, fullName]);
    await event(tx, quoteId, version, "ACCEPTED", `Accepted by ${fullName} (version ${version})`, email(clientEmail), "CLIENT");
    return { version, reference: q.reference, siteAddress: q.siteAddress, clientEmail: q.clientEmail };
  });
}

// ---------------------------------------------------------------- Company rates

export async function latestRateSet(db: Sql) {
  const [row] = await db.query<{ version: number; overrides: unknown; reason: string; createdBy: string; createdAt: Date }>(
    `SELECT "version", "overrides", "reason", "createdBy", "createdAt" FROM "TakeoffRateSet" ORDER BY "version" DESC LIMIT 1`);
  return row ?? null;
}

export async function saveRateSet(db: Db, expectedVersion: number, overrides: unknown, reason: string, actor: string) {
  return db.transaction(async tx => {
    const [row] = await tx.query<{ v: number }>(`SELECT COALESCE(max("version"), 0)::int AS "v" FROM "TakeoffRateSet"`);
    if (row.v !== expectedVersion) throw new StoreError("The rates were changed by someone else. Reload before saving.");
    await tx.query(`INSERT INTO "TakeoffRateSet" ("version", "overrides", "reason", "createdBy") VALUES ($1::int, $2::jsonb, $3, $4) RETURNING "id"`, [row.v + 1, json(overrides), reason, actor]);
    return { version: row.v + 1 };
  });
}

// ---------------------------------------------------------------- Supplier prices

export type SupplierCode = "SELCO" | "BUILDER_DEPOT" | "TOOLSTATION" | "SCREWFIX" | "TRAVIS_PERKINS" | "WICKES" | "JEWSON" | "B_AND_Q" | "MKM" | "CITY_PLUMBING" | "CEF" | "TOPPS_TILES";
export interface LinkRow { id: string; rateKey: string; supplier: SupplierCode; url: string; packQuantity: number; vatIncluded: boolean; active: boolean }

export async function listLinks(db: Sql, activeOnly = false) {
  return db.query<LinkRow>(`SELECT "id"::text AS "id", "rateKey", "supplier", "url", "packQuantity"::float8 AS "packQuantity", "vatIncluded", "active" FROM "TakeoffSupplierLink" ${activeOnly ? `WHERE "active"` : ""} ORDER BY "rateKey", "supplier"`);
}

export async function upsertLink(db: Sql, l: Omit<LinkRow, "id">, actor: string) {
  const [row] = await db.query<{ id: string }>(`INSERT INTO "TakeoffSupplierLink" ("rateKey", "supplier", "url", "packQuantity", "vatIncluded", "active", "createdBy")
    VALUES ($1, $2, $3, $4::numeric, $5::boolean, $6::boolean, $7)
    ON CONFLICT ("rateKey", "supplier") DO UPDATE SET "url" = EXCLUDED."url", "packQuantity" = EXCLUDED."packQuantity", "vatIncluded" = EXCLUDED."vatIncluded", "active" = EXCLUDED."active", "updatedAt" = now()
    RETURNING "id"::text AS "id"`, [l.rateKey, l.supplier, l.url, l.packQuantity, l.vatIncluded, l.active, actor]);
  return row.id;
}

export async function recordObservation(db: Sql, link: LinkRow, o: { ok: true; packPrice: number; imageUrl?: string } | { ok: false; error: string }) {
  const unit = o.ok ? (link.vatIncluded ? o.packPrice / 1.2 : o.packPrice) / link.packQuantity : null;
  await db.query(`INSERT INTO "TakeoffPriceObservation" ("linkId", "rateKey", "supplier", "status", "packPrice", "unitPriceExVat", "error", "imageUrl") VALUES ($1::uuid, $2, $3, $4, $5::numeric, $6::numeric, $7, $8) RETURNING "id"`,
    [link.id, link.rateKey, link.supplier, o.ok ? "OK" : "FAILED", o.ok ? o.packPrice : null, unit, o.ok ? null : o.error.slice(0, 500), o.ok ? (o.imageUrl ?? null) : null]);
}

/** Newest observation per link (OK or failed), for the admin page. */
export async function latestObservations(db: Sql) {
  return db.query<{ linkId: string; rateKey: string; supplier: string; status: string; packPrice: number | null; unitPriceExVat: number | null; error: string | null; imageUrl: string | null; observedAt: Date }>(`
    SELECT DISTINCT ON ("linkId") "linkId"::text AS "linkId", "rateKey", "supplier", "status", "packPrice"::float8 AS "packPrice", "unitPriceExVat"::float8 AS "unitPriceExVat", "error", "imageUrl", "observedAt"
    FROM "TakeoffPriceObservation" ORDER BY "linkId", "observedAt" DESC`);
}

/** Lowest current ex-VAT price per rate key from successful observations no older than maxAgeDays. */
export async function currentSupplierPrices(db: Sql, maxAgeDays = 8) {
  return db.query<{ rateKey: string; supplier: string; unitPriceExVat: number; observedAt: Date; imageUrl: string | null }>(`
    SELECT DISTINCT ON (o."rateKey") o."rateKey", o."supplier", o."unitPriceExVat"::float8 AS "unitPriceExVat", o."observedAt", o."imageUrl"
    FROM (SELECT DISTINCT ON ("linkId") * FROM "TakeoffPriceObservation" WHERE "status" = 'OK' AND "observedAt" > now() - ($1::int * interval '1 day') ORDER BY "linkId", "observedAt" DESC) o
    JOIN "TakeoffSupplierLink" l ON l."id" = o."linkId" AND l."active"
    ORDER BY o."rateKey", o."unitPriceExVat" ASC`, [maxAgeDays]);
}

/** Links whose newest observation is older than `hours` (or none yet), oldest first. */
export async function linksDue(db: Sql, hours = 20, limit = 40) {
  return db.query<LinkRow>(`
    SELECT l."id"::text AS "id", l."rateKey", l."supplier", l."url", l."packQuantity"::float8 AS "packQuantity", l."vatIncluded", l."active"
    FROM "TakeoffSupplierLink" l
    LEFT JOIN LATERAL (SELECT max("observedAt") AS "at" FROM "TakeoffPriceObservation" o WHERE o."linkId" = l."id") last ON true
    WHERE l."active" AND (last."at" IS NULL OR last."at" < now() - ($1::int * interval '1 hour'))
    ORDER BY last."at" ASC NULLS FIRST LIMIT $2::int`, [hours, limit]);
}

// ---------------------------------------------------------------- Products found automatically (migration 20261110120000)

export interface SuggestionRow { id: string; rateKey: string; supplier: SupplierCode; url: string; productName: string; packPrice: number | null; imageUrl: string | null; packGuess: number; packSure: boolean; score: number; createdAt: Date }

export async function suggestionsReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffSupplierSuggestion"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

/** Newest suggestion per material and merchant. */
export async function listSuggestions(db: Sql) {
  if (!(await suggestionsReady(db))) return [] as SuggestionRow[];
  return db.query<SuggestionRow>(`SELECT DISTINCT ON ("rateKey", "supplier") "id"::text AS "id", "rateKey", "supplier", "url", "productName", "packPrice"::float8 AS "packPrice", "imageUrl", "packGuess"::float8 AS "packGuess", "packSure", "score"::float8 AS "score", "createdAt"
    FROM "TakeoffSupplierSuggestion" ORDER BY "rateKey", "supplier", "createdAt" DESC`);
}

export async function addSuggestion(db: Sql, s: Omit<SuggestionRow, "id" | "createdAt">) {
  await db.query(`INSERT INTO "TakeoffSupplierSuggestion" ("rateKey", "supplier", "url", "productName", "packPrice", "imageUrl", "packGuess", "packSure", "score")
    VALUES ($1, $2, $3, $4, $5::numeric, $6, $7::numeric, $8::boolean, $9::numeric) RETURNING "id"`, [s.rateKey, s.supplier, s.url, s.productName.slice(0, 300), s.packPrice, s.imageUrl, s.packGuess, s.packSure, s.score]);
}

/** Materials with no active link for this merchant and no search in the last `days` days. */
export async function materialsToSearch(db: Sql, supplier: SupplierCode, keys: string[], days = 25, limit = 10) {
  if (!keys.length) return [] as string[];
  const rows = await db.query<{ rateKey: string }>(`
    SELECT k AS "rateKey" FROM unnest($1::text[]) AS k
    WHERE NOT EXISTS (SELECT 1 FROM "TakeoffSupplierLink" l WHERE l."rateKey" = k AND l."supplier" = $2 AND l."active")
      AND NOT EXISTS (SELECT 1 FROM "TakeoffSupplierSuggestion" s WHERE s."rateKey" = k AND s."supplier" = $2 AND s."createdAt" > now() - ($3::int * interval '1 day'))
    LIMIT $4::int`, [keys, supplier, days, limit]);
  return rows.map(r => r.rateKey);
}
