"use server";
import { revalidatePath } from "next/cache";
import { hashPassword, passwordProblems, verifyPassword } from "@/app/lib/auth/password";
import { accountById, revokeAllSessions, updateAccount } from "@/app/lib/auth/store";
import { currentAccount, currentToken, db, startSession } from "@/app/lib/auth/session.server";

export type AccountState = { ok?: boolean; message?: string; errors?: Record<string, string> };
const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

async function me() {
  const a = await currentAccount();
  if (!a || !a.emailVerifiedAt) throw new Error("Please sign in again.");
  return a;
}

export async function saveProfile(_: AccountState, fd: FormData): Promise<AccountState> {
  try {
    const a = await me();
    const name = str(fd, "name").trim(), phone = str(fd, "phone").trim();
    if (name.length < 2) return { ok: false, errors: { name: "Enter your name" } };
    if (phone && !/^(\+44\s?|0)(\d\s?){9,10}$/.test(phone.replace(/[()-]/g, ""))) return { ok: false, errors: { phone: "Enter a UK phone number" } };
    await updateAccount(db(), a.id, { name, phone });
    revalidatePath("/account");
    return { ok: true, message: "Saved." };
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Could not save." }; }
}

export async function changePassword(_: AccountState, fd: FormData): Promise<AccountState> {
  try {
    const a = await me();
    const full = await accountById(db(), a.id);
    if (full?.passwordHash) {
      const ok = await verifyPassword(str(fd, "current"), full.passwordHash);
      if (!ok.ok) return { ok: false, errors: { current: "That isn't your current password" } };
    }
    const pw = str(fd, "password");
    const problems = passwordProblems(pw, a.email, a.name);
    if (problems.length) return { ok: false, errors: { password: problems.join(". ") } };
    await updateAccount(db(), a.id, { passwordHash: await hashPassword(pw) });
    // A new password ends every session (a stolen one too); this device gets a fresh one straight away.
    await revokeAllSessions(db(), a.id);
    await startSession(full!, "NEW_PASSWORD");
    revalidatePath("/account");
    return { ok: true, message: full?.passwordHash ? "Password changed. Other devices have been signed out." : "Password set. You can now sign in with your email and password too." };
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Could not change the password." }; }
}

export async function signOutOtherDevices(): Promise<AccountState> {
  try { const a = await me(); await revokeAllSessions(db(), a.id, await currentToken()); revalidatePath("/account"); return { ok: true, message: "Signed out everywhere else." }; }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Could not sign out." }; }
}
