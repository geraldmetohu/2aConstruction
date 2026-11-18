// Who may receive marketing emails, and why. UK rules (PECR / UK GDPR): marketing emails need either the
// person's clear "yes" to marketing, or – for people who asked us for a quote – the "soft opt-in" (similar
// services, told about marketing when we got their details, unsubscribe in every email). Agreeing to our
// terms is NOT consent to marketing, so those people are listed but can't be selected.
// Pure store functions (no "server-only") so tests can run them.
import type { Sql } from "../takeoff/store";

export type Basis = "CONSENT" | "SOFT_OPT_IN" | "NONE";
export interface MarketingContact {
  email: string; name: string; firstName: string; basis: Basis; sources: string[];
  /** What happened most recently with them, e.g. "Quote Q-2026-031 accepted". */
  detail: string; lastAt: string | null; unsubscribed: boolean; status?: string;
}
export const CONSENT_WORDING = "Yes, send me occasional news and offers from 2A Construction. I can unsubscribe at any time.";

export async function marketingReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"MarketingConsent"') IS NOT NULL AND to_regclass('"MarketingCampaign"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}
const tableExists = async (db: Sql, t: string) => { try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`"${t}"`]); return !!r?.ok; } catch { return false; } };
const norm = (e: string) => e.trim().toLowerCase();
const okEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const firstOf = (n: string) => n.trim().split(/\s+/)[0] ?? "";

/** Record a "yes" to marketing (or renew it). Never overrides an unsubscribe unless `resubscribe`. */
export async function recordConsent(db: Sql, c: { email: string; name?: string; source: string; wording?: string; note?: string }, resubscribe = false) {
  const email = norm(c.email); if (!okEmail(email)) return false;
  await db.query(`INSERT INTO "MarketingConsent" ("email", "name", "source", "wording", "note") VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT ("email") DO UPDATE SET "name" = CASE WHEN EXCLUDED."name" <> '' THEN EXCLUDED."name" ELSE "MarketingConsent"."name" END,
      "source" = EXCLUDED."source", "wording" = EXCLUDED."wording", "note" = EXCLUDED."note",
      "consentAt" = CASE WHEN "MarketingConsent"."unsubscribedAt" IS NULL OR $6::boolean THEN now() ELSE "MarketingConsent"."consentAt" END,
      "unsubscribedAt" = CASE WHEN $6::boolean THEN NULL ELSE "MarketingConsent"."unsubscribedAt" END, "updatedAt" = now()`,
    [email, (c.name ?? "").slice(0, 120), c.source.slice(0, 60), (c.wording ?? CONSENT_WORDING).slice(0, 500), (c.note ?? "").slice(0, 500), resubscribe]);
  return true;
}
/** Unsubscribe (from Resend's unsubscribe link, a reply, or by hand). Keeps the row so they're never emailed again. */
export async function recordUnsubscribe(db: Sql, email: string, source = "UNSUBSCRIBED") {
  const e = norm(email); if (!okEmail(e)) return;
  await db.query(`INSERT INTO "MarketingConsent" ("email", "source", "unsubscribedAt") VALUES ($1, $2, now())
    ON CONFLICT ("email") DO UPDATE SET "unsubscribedAt" = COALESCE("MarketingConsent"."unsubscribedAt", now()), "updatedAt" = now()`, [e, source]);
}

/** Everyone we hold an email for, with whether (and why) they may get marketing. */
export async function marketingContacts(db: Sql): Promise<MarketingContact[]> {
  const map = new Map<string, MarketingContact>();
  const touch = (email: string, name: string, basis: Basis, source: string, detail: string, at: Date | string | null) => {
    const e = norm(email); if (!okEmail(e)) return;
    const rank = { CONSENT: 2, SOFT_OPT_IN: 1, NONE: 0 } as const;
    const cur = map.get(e);
    const iso = at ? new Date(at).toISOString() : null;
    if (!cur) { map.set(e, { email: e, name, firstName: firstOf(name), basis, sources: [source], detail, lastAt: iso, unsubscribed: false }); return; }
    if (!cur.sources.includes(source)) cur.sources.push(source);
    if (rank[basis] > rank[cur.basis]) cur.basis = basis;
    if (!cur.name && name) { cur.name = name; cur.firstName = firstOf(name); }
    if (iso && (!cur.lastAt || iso > cur.lastAt)) { cur.lastAt = iso; cur.detail = detail; }
  };
  // 1. Quotes we sent or that were accepted: the soft opt-in (they asked us to price similar work).
  if (await tableExists(db, "TakeoffQuote")) {
    for (const q of await db.query<{ email: string; name: string; reference: string; status: string; at: Date | null }>(
      `SELECT "clientEmail" AS "email", "clientName" AS "name", "reference", "status", COALESCE("acceptedAt", "sentAt", "createdAt") AS "at" FROM "TakeoffQuote" WHERE "status" IN ('SENT', 'ACCEPTED') AND "createdBy" <> 'DEMO'`))
      touch(q.email, q.name, "SOFT_OPT_IN", "Quote", `Quote ${q.reference} ${q.status === "ACCEPTED" ? "accepted" : "sent"}`, q.at);
  }
  // 2. Website estimator: agreed to the terms (and to being contacted about their request) – not to marketing.
  if (await tableExists(db, "Client")) {
    for (const c of await db.query<{ email: string; name: string; at: Date | null }>(`SELECT "email", "fullName" AS "name", "createdAt" AS "at" FROM "Client"`))
      touch(c.email, c.name, "NONE", "Estimator", "Used the online estimator", c.at);
  }
  // 3. People who said yes to marketing (estimator tick box, quote acceptance, or added by the office) – and unsubscribes.
  if (await marketingReady(db)) {
    for (const m of await db.query<{ email: string; name: string; source: string; at: Date; unsub: Date | null }>(`SELECT "email", "name", "source", "consentAt" AS "at", "unsubscribedAt" AS "unsub" FROM "MarketingConsent"`)) {
      if (!m.unsub && m.source !== "UNSUBSCRIBED") touch(m.email, m.name, "CONSENT", "Said yes to marketing", `Said yes to news & offers (${m.source.toLowerCase().replace(/_/g, " ")})`, m.at);
      else { touch(m.email, m.name, "NONE", "Unsubscribed", "Unsubscribed", m.unsub ?? m.at); map.get(norm(m.email))!.unsubscribed = true; }
    }
  }
  return [...map.values()].sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
}
export const sendable = (c: MarketingContact) => !c.unsubscribed && c.basis !== "NONE";
