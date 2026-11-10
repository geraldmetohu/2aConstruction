// Accounts, sessions, one-time email links and sign-in attempts (migration 20261111120000_add_accounts).
// Plain parameterised SQL so it runs on Prisma ($queryRawUnsafe) and on in-memory Postgres in tests.
// Nothing is ever deleted: sessions and links are revoked / marked used.
import type { Sql } from "@/app/lib/takeoff/store";
import { newToken, sha256 } from "./password";

export type Role = "ADMIN" | "STAFF" | "CLIENT" | "TRADE";
export const ROLES: [Role, string][] = [["CLIENT", "Client"], ["TRADE", "Trade"], ["STAFF", "Staff / project manager"], ["ADMIN", "Admin"]];
export type TokenPurpose = "VERIFY" | "RESET" | "MAGIC" | "INVITE";

export interface Account {
  id: string; email: string; name: string; phone: string; passwordHash: string | null; emailVerifiedAt: Date | null; role: Role; trade: string | null;
  userId: string | null; googleSub: string | null; avatarUrl: string | null; disabledAt: Date | null; passwordChangedAt: Date | null; lastLoginAt: Date | null; createdAt: Date;
}
const COLS = `"id"::text AS "id", "email", "name", "phone", "passwordHash", "emailVerifiedAt", "role", "trade", "userId", "googleSub", "avatarUrl", "disabledAt", "passwordChangedAt", "lastLoginAt", "createdAt"`;

export const SESSION_DAYS = 30, SESSION_MAX_DAYS = 90;
const TTL: Record<TokenPurpose, number> = { VERIFY: 24 * 60, RESET: 60, MAGIC: 15, INVITE: 7 * 24 * 60 };

export async function authReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"AuthAccount"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

export async function accountByEmail(db: Sql, email: string) {
  const [a] = await db.query<Account>(`SELECT ${COLS} FROM "AuthAccount" WHERE "email" = $1`, [email]);
  return a ?? null;
}
export async function accountById(db: Sql, id: string) {
  const [a] = await db.query<Account>(`SELECT ${COLS} FROM "AuthAccount" WHERE "id" = $1::uuid`, [id]);
  return a ?? null;
}
export async function accountByGoogle(db: Sql, sub: string) {
  const [a] = await db.query<Account>(`SELECT ${COLS} FROM "AuthAccount" WHERE "googleSub" = $1`, [sub]);
  return a ?? null;
}

export async function createAccount(db: Sql, a: { email: string; name?: string; phone?: string; role?: Role; trade?: string | null; verified?: boolean; googleSub?: string | null; avatarUrl?: string | null; passwordHash?: string | null }) {
  const [row] = await db.query<Account>(`INSERT INTO "AuthAccount" ("email", "name", "phone", "role", "trade", "emailVerifiedAt", "googleSub", "avatarUrl", "passwordHash", "passwordChangedAt")
    VALUES ($1, $2, $3, $4, $5, CASE WHEN $6::boolean THEN now() END, $7, $8, $9, CASE WHEN $9::text IS NOT NULL THEN now() END)
    ON CONFLICT ("email") DO NOTHING RETURNING ${COLS}`,
    [a.email, (a.name ?? "").slice(0, 120), (a.phone ?? "").slice(0, 40), a.role ?? "CLIENT", a.trade ?? null, !!a.verified, a.googleSub ?? null, a.avatarUrl ?? null, a.passwordHash ?? null]);
  return row ?? accountByEmail(db, a.email);
}

export async function updateAccount(db: Sql, id: string, p: Partial<{ name: string; phone: string; role: Role; trade: string | null; userId: string; googleSub: string; avatarUrl: string; disabled: boolean; verified: boolean; passwordHash: string; loggedIn: boolean }>) {
  const sets: string[] = [], vals: unknown[] = [id];
  const set = (col: string, v: unknown, cast = "") => { vals.push(v); sets.push(`"${col}" = $${vals.length}${cast}`); };
  if (p.name !== undefined) set("name", p.name.slice(0, 120));
  if (p.phone !== undefined) set("phone", p.phone.slice(0, 40));
  if (p.role !== undefined) set("role", p.role);
  if (p.trade !== undefined) set("trade", p.trade);
  if (p.userId !== undefined) set("userId", p.userId);
  if (p.googleSub !== undefined) set("googleSub", p.googleSub);
  if (p.avatarUrl !== undefined) set("avatarUrl", p.avatarUrl);
  if (p.disabled !== undefined) sets.push(`"disabledAt" = ${p.disabled ? "COALESCE(\"disabledAt\", now())" : "NULL"}`);
  if (p.verified) sets.push(`"emailVerifiedAt" = COALESCE("emailVerifiedAt", now())`);
  if (p.passwordHash !== undefined) { set("passwordHash", p.passwordHash); sets.push(`"passwordChangedAt" = now()`); }
  if (p.loggedIn) sets.push(`"lastLoginAt" = now()`);
  if (!sets.length) return;
  await db.query(`UPDATE "AuthAccount" SET ${sets.join(", ")}, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, vals);
}

export async function listAccounts(db: Sql, q = "", limit = 200) {
  return db.query<Account>(`SELECT ${COLS} FROM "AuthAccount" WHERE ($1 = '' OR "email" ILIKE '%' || $1 || '%' OR "name" ILIKE '%' || $1 || '%') ORDER BY "createdAt" DESC LIMIT $2::int`, [q, limit]);
}

// ---------------------------------------------------------------- Sessions

export async function createSession(db: Sql, accountId: string, meta: { userAgent?: string; ip?: string; method?: string } = {}) {
  const { token, id } = newToken();
  await db.query(`INSERT INTO "AuthSession" ("id", "accountId", "expiresAt", "userAgent", "ip", "method") VALUES ($1, $2::uuid, now() + ($3::int * interval '1 day'), $4, $5, $6) RETURNING "id"`,
    [id, accountId, SESSION_DAYS, (meta.userAgent ?? "").slice(0, 300), (meta.ip ?? "").slice(0, 64), meta.method ?? "PASSWORD"]);
  return token;
}

/**
 * The account for a session cookie, or null (unknown, revoked, expired, account disabled, or password changed since).
 * Sliding expiry: each visit (at most every 10 minutes) extends it by SESSION_DAYS, never past SESSION_MAX_DAYS from sign-in.
 */
export async function sessionAccount(db: Sql, token: string) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const id = sha256(token);
  const [row] = await db.query<Account & { sessionId: string; lastSeenAt: Date; sessionCreatedAt: Date }>(`
    SELECT ${COLS.split(", ").map(c => c.startsWith('"id"') ? `a."id"::text AS "id"` : `a.${c}`).join(", ")}, s."id" AS "sessionId", s."lastSeenAt", s."createdAt" AS "sessionCreatedAt"
    FROM "AuthSession" s JOIN "AuthAccount" a ON a."id" = s."accountId"
    WHERE s."id" = $1 AND s."revokedAt" IS NULL AND s."expiresAt" > now() AND a."disabledAt" IS NULL
      AND (a."passwordChangedAt" IS NULL OR a."passwordChangedAt" <= s."createdAt" + interval '5 seconds')`, [id]);
  if (!row) return null;
  if (Date.now() - new Date(row.lastSeenAt).getTime() > 10 * 60 * 1000)
    await db.query(`UPDATE "AuthSession" SET "lastSeenAt" = now(), "expiresAt" = LEAST(now() + ($2::int * interval '1 day'), "createdAt" + ($3::int * interval '1 day')) WHERE "id" = $1 RETURNING "id"`, [id, SESSION_DAYS, SESSION_MAX_DAYS]);
  return row;
}

export async function revokeSession(db: Sql, token: string) {
  await db.query(`UPDATE "AuthSession" SET "revokedAt" = COALESCE("revokedAt", now()) WHERE "id" = $1 RETURNING "id"`, [sha256(token)]);
}
/** Sign out everywhere (optionally keeping the current session). */
export async function revokeAllSessions(db: Sql, accountId: string, keepToken?: string) {
  await db.query(`UPDATE "AuthSession" SET "revokedAt" = now() WHERE "accountId" = $1::uuid AND "revokedAt" IS NULL AND ($2::text IS NULL OR "id" <> $2) RETURNING "id"`, [accountId, keepToken ? sha256(keepToken) : null]);
}
export async function listSessions(db: Sql, accountId: string) {
  return db.query<{ id: string; createdAt: Date; lastSeenAt: Date; userAgent: string; ip: string; method: string }>(`SELECT "id", "createdAt", "lastSeenAt", "userAgent", "ip", "method" FROM "AuthSession"
    WHERE "accountId" = $1::uuid AND "revokedAt" IS NULL AND "expiresAt" > now() ORDER BY "lastSeenAt" DESC LIMIT 20`, [accountId]);
}

// ---------------------------------------------------------------- One-time email links

export async function createToken(db: Sql, purpose: TokenPurpose, email: string, accountId: string | null) {
  const { token, id } = newToken();
  await db.query(`INSERT INTO "AuthToken" ("id", "accountId", "email", "purpose", "expiresAt") VALUES ($1, $2::uuid, $3, $4, now() + ($5::int * interval '1 minute')) RETURNING "id"`,
    [id, accountId, email, purpose, TTL[purpose]]);
  return token;
}
/** Look at a link without using it (so email scanners that open links don't burn it). */
export async function peekToken(db: Sql, token: string, purposes: TokenPurpose[]) {
  const [t] = await db.query<{ email: string; accountId: string | null; purpose: TokenPurpose }>(`SELECT "email", "accountId"::text AS "accountId", "purpose" FROM "AuthToken"
    WHERE "id" = $1 AND "usedAt" IS NULL AND "expiresAt" > now() AND "purpose" = ANY($2::text[])`, [sha256(token), purposes]);
  return t ?? null;
}
/** Use a link once: atomically marks it used and returns it, or null if already used / expired. */
export async function consumeToken(db: Sql, token: string, purposes: TokenPurpose[]) {
  const [t] = await db.query<{ email: string; accountId: string | null; purpose: TokenPurpose }>(`UPDATE "AuthToken" SET "usedAt" = now()
    WHERE "id" = $1 AND "usedAt" IS NULL AND "expiresAt" > now() AND "purpose" = ANY($2::text[]) RETURNING "email", "accountId"::text AS "accountId", "purpose"`, [sha256(token), purposes]);
  return t ?? null;
}
/** How many links of this kind were sent to this address recently (to stop email flooding). */
export async function recentTokens(db: Sql, email: string, minutes = 60) {
  const [r] = await db.query<{ n: number }>(`SELECT count(*)::int AS "n" FROM "AuthToken" WHERE "email" = $1 AND "createdAt" > now() - ($2::int * interval '1 minute')`, [email, minutes]);
  return r?.n ?? 0;
}

// ---------------------------------------------------------------- Attempts (rate limiting)

export async function recordAttempt(db: Sql, keys: string[], ok: boolean) {
  for (const k of keys) await db.query(`INSERT INTO "AuthAttempt" ("key", "ok") VALUES ($1, $2::boolean) RETURNING "id"`, [k.slice(0, 200), ok]);
}
/** Failed attempts for any of the keys in the last `minutes`, since the last success for that key. */
export async function failures(db: Sql, keys: string[], minutes = 15) {
  const rows = await db.query<{ n: number }>(`SELECT count(*)::int AS "n" FROM "AuthAttempt" a WHERE a."key" = ANY($1::text[]) AND NOT a."ok" AND a."at" > now() - ($2::int * interval '1 minute')
    AND a."at" > COALESCE((SELECT max(b."at") FROM "AuthAttempt" b WHERE b."key" = a."key" AND b."ok"), 'epoch') GROUP BY a."key"`, [keys, minutes]);
  return rows.reduce((m, r) => Math.max(m, r.n), 0);
}

// ---------------------------------------------------------------- Quote reference sign-in

/** A quote the client has been sent (published), found by its reference, with the site postcode from that version. */
export async function quoteForClaim(db: Sql, reference: string) {
  const [q] = await db.query<{ id: string; clientEmail: string; clientName: string; postcode: string | null }>(`
    SELECT q."id"::text AS "id", q."clientEmail", q."clientName", v."input"->'property'->>'postcode' AS "postcode"
    FROM "TakeoffQuote" q JOIN "TakeoffQuoteVersion" v ON v."quoteId" = q."id" AND v."version" = q."publishedVersion"
    WHERE upper(q."reference") = upper($1) AND q."publishedVersion" IS NOT NULL`, [reference.trim()]);
  return q ?? null;
}
export const maskEmail = (e: string) => { const [u, d] = e.split("@"); return `${u.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(6, u.length - 1)))}@${d}`; };
