// When a quote is sent, the client's details from it are kept on their login (name and phone), so the
// Logins page, emails and the portal know who they are before they ever sign in. Nothing the client
// set themselves is overwritten – only empty fields are filled. No password is set here.
import { accountByEmail, authReady, createAccount, updateAccount } from "../auth/store";
import type { Sql } from "./store";

export interface QuoteClient { name: string; email: string; phone: string }

/** The client on a quote: name and email from the quote, phone from its latest version. */
export async function quoteClient(db: Sql, quoteId: string): Promise<QuoteClient | null> {
  const [r] = await db.query<QuoteClient>(`SELECT q."clientName" AS "name", q."clientEmail" AS "email", COALESCE(v."input" -> 'terms' ->> 'clientPhone', '') AS "phone"
    FROM "TakeoffQuote" q LEFT JOIN "TakeoffQuoteVersion" v ON v."quoteId" = q."id" AND v."version" = q."currentVersion" WHERE q."id" = $1::uuid`, [quoteId]);
  return r ?? null;
}

/** Create the client's login if there isn't one, or fill in a missing name / phone. Returns what happened. */
export async function rememberClient(db: Sql, quoteId: string): Promise<"created" | "updated" | "unchanged" | "skipped"> {
  if (!(await authReady(db))) return "skipped";
  const c = await quoteClient(db, quoteId);
  if (!c?.email) return "skipped";
  const email = c.email.trim().toLowerCase();
  const a = await accountByEmail(db, email);
  if (!a) { await createAccount(db, { email, name: c.name, phone: c.phone, role: "CLIENT" }); return "created"; }
  const patch: { name?: string; phone?: string } = {};
  if (!a.name && c.name) patch.name = c.name;
  if (!a.phone && c.phone) patch.phone = c.phone;
  if (!Object.keys(patch).length) return "unchanged";
  await updateAccount(db, a.id, patch);
  return "updated";
}
