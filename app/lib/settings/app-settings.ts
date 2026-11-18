// Small admin settings kept in the AppSetting table (migration 20261118130000_admin_tools).
// Pure store functions (no "server-only") so tests can run them.
import { randomBytes } from "node:crypto";
import type { Sql } from "../takeoff/store";

export async function settingsReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"AppSetting"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}
export async function getSetting(db: Sql, key: string): Promise<string | null> {
  if (!(await settingsReady(db))) return null;
  const [r] = await db.query<{ value: string }>(`SELECT "value" FROM "AppSetting" WHERE "key" = $1`, [key]);
  return r?.value ?? null;
}
export async function setSetting(db: Sql, key: string, value: string) {
  await db.query(`INSERT INTO "AppSetting" ("key", "value") VALUES ($1, $2) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now()`, [key, value]);
}

/** Which automatic emails are switched on. The morning list and client reminders start OFF. */
export interface NotificationSettings {
  /** 06:30 email to the office with today's list (orders, payments, answers, team owed). */
  morningList: boolean;
  /** 06:30 reminders to clients about items they must order and payments due soon. */
  clientReminders: boolean;
  /** One email an hour listing what clients changed in their portal. */
  portalDigest: boolean;
  /** A week after handover, ask the client for a review. */
  reviewRequests: boolean;
}
export const DEFAULT_NOTIFICATIONS: NotificationSettings = { morningList: false, clientReminders: false, portalDigest: true, reviewRequests: true };

export async function getNotifications(db: Sql): Promise<NotificationSettings> {
  try {
    const raw = await getSetting(db, "notifications");
    const saved = raw ? (JSON.parse(raw) as Partial<NotificationSettings>) : {};
    const out = { ...DEFAULT_NOTIFICATIONS };
    for (const k of Object.keys(out) as (keyof NotificationSettings)[]) if (typeof saved[k] === "boolean") out[k] = saved[k]!;
    return out;
  } catch { return { ...DEFAULT_NOTIFICATIONS }; }
}
export async function saveNotifications(db: Sql, n: NotificationSettings) {
  await setSetting(db, "notifications", JSON.stringify(n));
}

/** A secret token, created once (used for the calendar feed link). `rotate` makes a new one (old links stop working). */
export async function secretToken(db: Sql, key: string, rotate = false): Promise<string | null> {
  if (!(await settingsReady(db))) return null;
  if (!rotate) { const t = await getSetting(db, key); if (t) return t; }
  const t = randomBytes(24).toString("base64url");
  await setSetting(db, key, t);
  return t;
}
