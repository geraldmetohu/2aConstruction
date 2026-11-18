// The client's drawn signature on acceptance (plus name, time, IP address and device) – evidence of the contract.
// Pure store functions (no "server-only") so tests can run them.
import type { Sql } from "./store";

export interface AcceptanceSignature { quoteId: string; version: number; signedName: string; email: string; image: string; ip: string; userAgent: string; signedAt: Date }

export async function signaturesReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffAcceptanceSignature"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

/** A PNG data URL drawn on the signature pad: at most ~300 KB, and not blank (checked by the browser too). */
export function validSignatureImage(s: unknown): s is string {
  return typeof s === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s) && s.length > 800 && s.length < 400_000;
}

export async function saveAcceptanceSignature(db: Sql, x: Omit<AcceptanceSignature, "signedAt">) {
  await db.query(`INSERT INTO "TakeoffAcceptanceSignature" ("quoteId", "version", "signedName", "email", "image", "ip", "userAgent") VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`,
    [x.quoteId, x.version, x.signedName.slice(0, 120), x.email.slice(0, 320), x.image, x.ip.slice(0, 100), x.userAgent.slice(0, 500)]);
}

/** The latest signature for a quote (the one that accepted it). */
export async function getAcceptanceSignature(db: Sql, quoteId: string): Promise<AcceptanceSignature | null> {
  if (!(await signaturesReady(db))) return null;
  const [r] = await db.query<AcceptanceSignature>(`SELECT "quoteId"::text AS "quoteId", "version", "signedName", "email", "image", "ip", "userAgent", "signedAt" FROM "TakeoffAcceptanceSignature"
    WHERE "quoteId" = $1::uuid ORDER BY "signedAt" DESC LIMIT 1`, [quoteId]);
  return r ?? null;
}

/** The client's signature as the documents show it (undefined when they haven't signed online). */
export async function clientSignedFor(db: Sql, quoteId: string): Promise<{ name: string; signatureUrl: string; date: string; ip?: string } | undefined> {
  const s = await getAcceptanceSignature(db, quoteId).catch(() => null);
  if (!s) return undefined;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(s.signedAt));
  return { name: s.signedName, signatureUrl: s.image, date, ip: s.ip };
}
