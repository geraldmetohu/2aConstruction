"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { normEmail, validEmail } from "@/app/lib/auth/password";
import { accountByEmail, accountById, authReady, createAccount, createToken, recentTokens, revokeAllSessions, updateAccount } from "@/app/lib/auth/store";
import { db } from "@/app/lib/auth/session.server";
import { sendInvite, sendResetEmail } from "@/app/lib/auth/emails.server";
import { tradeKeys } from "@/app/lib/takeoff/schema";

const role = z.enum(["CLIENT", "TRADE", "STAFF"]);
const trade = z.enum(tradeKeys).nullable();
const msg = (e: unknown) => e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : e instanceof Error ? e.message : "Could not save.";
async function ready() {
  await requireCatalogueAdmin();
  const d = db();
  if (!(await authReady(d))) throw new Error("Accounts need migration 20261111120000_add_accounts.");
  return d;
}

/** Create an account for a client, trade or staff member and email them a link to choose their password. */
export async function inviteAccount(raw: unknown) {
  try {
    const d = await ready();
    const v = z.object({ email: z.string().transform(normEmail).refine(validEmail, "Enter a valid email"), name: z.string().trim().max(120), role, trade }).parse(raw);
    let a = await accountByEmail(d, v.email);
    if (!a) a = await createAccount(d, { email: v.email, name: v.name, role: v.role, trade: v.role === "TRADE" ? v.trade : null });
    else await updateAccount(d, a.id, { role: v.role, trade: v.role === "TRADE" ? v.trade : null, ...(v.name && !a.name ? { name: v.name } : {}) });
    if (await recentTokens(d, v.email) >= 5) throw new Error("Several emails were sent to this address in the last hour – wait a little.");
    const r = a!.passwordHash ? await sendResetEmail(v.email, await createToken(d, "RESET", v.email, a!.id))
      : await sendInvite(v.email, await createToken(d, "INVITE", v.email, a!.id), v.role, v.name || a!.name);
    revalidatePath("/dashboard/accounts");
    return { ok: true as const, message: r.sent ? `Invitation sent to ${v.email}.` : `Account saved, but the email wasn't sent (${r.reason}).` };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

export async function updateAccountRole(id: string, raw: unknown) {
  try {
    const d = await ready();
    const v = z.object({ role, trade }).parse(raw);
    if (!(await accountById(d, id))) throw new Error("Account not found.");
    await updateAccount(d, id, { role: v.role, trade: v.role === "TRADE" ? v.trade : null });
    revalidatePath("/dashboard/accounts");
    return { ok: true as const };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

/** Switch an account off (signs it out everywhere) or back on. Nothing is deleted. */
export async function setAccountDisabled(id: string, disabled: boolean) {
  try {
    const d = await ready();
    await updateAccount(d, id, { disabled });
    if (disabled) await revokeAllSessions(d, id);
    revalidatePath("/dashboard/accounts");
    return { ok: true as const };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

export async function sendPasswordLink(id: string) {
  try {
    const d = await ready();
    const a = await accountById(d, id);
    if (!a) throw new Error("Account not found.");
    if (await recentTokens(d, a.email) >= 5) throw new Error("Several emails were sent to this address in the last hour – wait a little.");
    const r = await sendResetEmail(a.email, await createToken(d, "RESET", a.email, a.id));
    return { ok: r.sent, message: r.sent ? `Password link sent to ${a.email}.` : `Not sent: ${r.reason}` };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}
