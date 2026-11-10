"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mailConfigured } from "@/app/lib/takeoff/mail.server";
import { hashPassword, normEmail, passwordProblems, safeNext, validEmail, verifyPassword } from "@/app/lib/auth/password";
import {
  accountByEmail, accountById, authReady, maskEmail, quoteForClaim, consumeToken, createAccount, createToken, failures, peekToken, recentTokens, recordAttempt, revokeAllSessions, updateAccount,
} from "@/app/lib/auth/store";
import { clientIp, db, effectiveRole, endSession, homeFor, startSession } from "@/app/lib/auth/session.server";
import { sendAlreadyRegistered, sendMagicLink, sendResetEmail, sendVerifyEmail } from "@/app/lib/auth/emails.server";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; sent?: boolean; email?: string };
const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const NOT_READY: FormState = { ok: false, message: "Sign-in is being set up – please try again shortly, or call us." };
const MAX_FAILS = 8;

async function ready() { const d = db(); return (await authReady(d)) ? d : null; }

/** Same answer whether or not the email has an account, so nobody can find out who our customers are. */
const SENT = (email: string): FormState => ({ ok: true, sent: true, email, message: mailConfigured() ? "" : "We couldn't send the email right now – please call us and we'll help you sign in." });

// ---------------------------------------------------------------- Sign in with email + password

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const d = await ready(); if (!d) return NOT_READY;
  const email = normEmail(str(fd, "email")), password = str(fd, "password"), next = safeNext(str(fd, "next"), "");
  if (!validEmail(email)) return { ok: false, errors: { email: "Enter your email address" }, email };
  if (!password) return { ok: false, errors: { password: "Enter your password" }, email };
  const ip = await clientIp();
  const keys = [`login:email:${email}`, `login:ip:${ip}`];
  if (await failures(d, keys, 15) >= MAX_FAILS) return { ok: false, email, message: "Too many attempts. Wait 15 minutes, or sign in with an email link or Google." };

  const a = await accountByEmail(d, email);
  const check = await verifyPassword(password, a?.passwordHash);
  if (!a || !check.ok || a.disabledAt) {
    await recordAttempt(d, keys, false);
    if (a && !a.passwordHash && !a.disabledAt) return { ok: false, email, message: "This account doesn't have a password yet. Use “Email me a sign-in link”, Google, or “Forgot password” to set one." };
    return { ok: false, email, message: "That email and password don't match. Signed in with our old sign-in page before? Use “Forgot password” or “Email me a sign-in link” once – that sets you up on the new one." };
  }
  if (!a.emailVerifiedAt) {
    const r = await recentTokens(d, email) < 5 ? await sendVerifyEmail(email, await createToken(d, "VERIFY", email, a.id), a.name) : null;
    return { ok: false, email, message: r && !r.sent ? "Please confirm your email first – we couldn't send the link just now, try again in a minute." : "Please confirm your email first – we've sent you a new link." };
  }
  await recordAttempt(d, keys, true);
  if (check.rehash) await updateAccount(d, a.id, { passwordHash: await hashPassword(password) });
  await startSession(a, "PASSWORD");
  redirect(homeFor(effectiveRole(a), next));
}

// ---------------------------------------------------------------- Create an account (email first, password after confirming)

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().transform(normEmail).refine(validEmail, "Enter a valid email address"),
  phone: z.string().trim().max(40).refine(p => !p || /^(\+44\s?|0)(\d\s?){9,10}$/.test(p.replace(/[()-]/g, "")), "Enter a UK phone number (or leave it empty)"),
  terms: z.literal("on", { errorMap: () => ({ message: "Please accept the terms and privacy notice" }) }),
});

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const d = await ready(); if (!d) return NOT_READY;
  const p = signupSchema.safeParse({ name: str(fd, "name"), email: str(fd, "email"), phone: str(fd, "phone"), terms: str(fd, "terms") });
  if (!p.success) return { ok: false, email: str(fd, "email"), errors: Object.fromEntries(p.error.issues.map(i => [String(i.path[0]), i.message])) };
  const { name, email, phone } = p.data;
  const ip = await clientIp();
  if (await failures(d, [`signup:ip:${ip}`], 60) >= 20 || await recentTokens(d, email) >= 5) return SENT(email);
  await recordAttempt(d, [`signup:ip:${ip}`], false); // counts sign-ups per IP; never "succeeds" so the limit holds

  const existing = await accountByEmail(d, email);
  if (existing?.emailVerifiedAt) return existing.disabledAt ? SENT(email) : SENT_OR_FAILED(email, await sendAlreadyRegistered(email, await createToken(d, "RESET", email, existing.id)));
  const a = existing ?? await createAccount(d, { email, name, phone, role: "CLIENT" });
  if (existing && !existing.emailVerifiedAt) await updateAccount(d, existing.id, { name, phone });
  return SENT_OR_FAILED(email, await sendVerifyEmail(email, await createToken(d, "VERIFY", email, a!.id), name));
}

// ---------------------------------------------------------------- Forgotten password / sign-in link by email

/**
 * The account for an email, created if there isn't one yet – e.g. people (admins included) who used the old Kinde
 * sign-in, or clients we've quoted. Safe: the link only goes to that inbox, so only its owner can use it.
 */
async function accountForLink(d: NonNullable<Awaited<ReturnType<typeof ready>>>, email: string) {
  return (await accountByEmail(d, email)) ?? createAccount(d, { email, role: "CLIENT" });
}

/** Rate limits for emailed links: 5 per address an hour, 20 per IP address an hour. */
async function linkAllowed(d: NonNullable<Awaited<ReturnType<typeof ready>>>, email: string) {
  const ip = await clientIp();
  if (await recentTokens(d, email) >= 5 || await failures(d, [`link:ip:${ip}`], 60) >= 20) return false;
  await recordAttempt(d, [`link:ip:${ip}`], false); // counted per IP; never "succeeds" so the limit holds
  return true;
}

const SENT_OR_FAILED = (email: string, r: { sent: boolean } | null): FormState =>
  r && !r.sent ? { ok: false, email, message: "We couldn't send the email just now. Please try again in a minute, or call us." } : SENT(email);

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const d = await ready(); if (!d) return NOT_READY;
  const email = normEmail(str(fd, "email"));
  if (!validEmail(email)) return { ok: false, errors: { email: "Enter your email address" }, email };
  if (!(await linkAllowed(d, email))) return SENT(email);
  const a = await accountForLink(d, email);
  if (!a || a.disabledAt) return SENT(email);
  return SENT_OR_FAILED(email, await sendResetEmail(email, await createToken(d, "RESET", email, a.id)));
}

export async function requestMagicLink(_: FormState, fd: FormData): Promise<FormState> {
  const d = await ready(); if (!d) return NOT_READY;
  const email = normEmail(str(fd, "email"));
  if (!validEmail(email)) return { ok: false, errors: { email: "Enter your email address first" }, email };
  if (!(await linkAllowed(d, email))) return SENT(email);
  const a = await accountForLink(d, email);
  if (!a || a.disabledAt) return SENT(email);
  return SENT_OR_FAILED(email, await sendMagicLink(email, await createToken(d, "MAGIC", email, a.id)));
}

/** The link only shows a "Sign in" button; pressing it uses the link (email scanners that open links can't burn it). */
export async function emailLinkSignIn(_: FormState, fd: FormData): Promise<FormState> {
  const d = await ready(); if (!d) return NOT_READY;
  const t = await consumeToken(d, str(fd, "token"), ["MAGIC"]);
  if (!t?.accountId) return { ok: false, message: "This link has expired or was already used. Ask for a new one." };
  const a = await accountById(d, t.accountId);
  if (!a || a.disabledAt || a.email !== t.email) return { ok: false, message: "This link can't be used. Ask for a new one." };
  await updateAccount(d, a.id, { verified: true });
  await startSession({ ...a, emailVerifiedAt: a.emailVerifiedAt ?? new Date() }, "EMAIL_LINK");
  redirect(homeFor(effectiveRole({ ...a, emailVerifiedAt: new Date() }), safeNext(str(fd, "next"), "")));
}

// ---------------------------------------------------------------- Choose a password (after confirming the email, an invite, or a reset)

export async function choosePassword(_: FormState, fd: FormData): Promise<FormState> {
  const d = await ready(); if (!d) return NOT_READY;
  const token = str(fd, "token"), password = str(fd, "password");
  const peek = await peekToken(d, token, ["VERIFY", "INVITE", "RESET"]);
  if (!peek?.accountId) return { ok: false, message: "This link has expired or was already used. Ask for a new one." };
  const a = await accountById(d, peek.accountId);
  if (!a || a.disabledAt || a.email !== peek.email) return { ok: false, message: "This link can't be used. Ask for a new one." };
  const problems = passwordProblems(password, a.email, a.name);
  if (problems.length) return { ok: false, errors: { password: problems.join(". ") } };
  const t = await consumeToken(d, token, ["VERIFY", "INVITE", "RESET"]);
  if (!t) return { ok: false, message: "This link has expired or was already used. Ask for a new one." };
  await updateAccount(d, a.id, { passwordHash: await hashPassword(password), verified: true });
  await revokeAllSessions(d, a.id); // a new password signs out every other device
  await startSession({ ...a, emailVerifiedAt: a.emailVerifiedAt ?? new Date() }, "NEW_PASSWORD");
  redirect(homeFor(effectiveRole({ ...a, emailVerifiedAt: new Date() }), safeNext(str(fd, "next"), "")));
}

// ---------------------------------------------------------------- Sign in with a quote reference + postcode

/** Emails a sign-in link to the address the quote was sent to (never to an address typed here). */
export async function claimQuote(_: FormState, fd: FormData): Promise<FormState> {
  const d = await ready(); if (!d) return NOT_READY;
  const reference = str(fd, "reference").trim().slice(0, 40), postcode = str(fd, "postcode").toUpperCase().replace(/\s+/g, "");
  if (!reference || !postcode) return { ok: false, errors: { reference: "Enter the reference and postcode from your quote" } };
  const ip = await clientIp();
  if (await failures(d, [`claim:ip:${ip}`], 60) >= 10) return { ok: false, message: "Too many tries – please wait an hour or call us." };
  let q = null;
  try { q = await quoteForClaim(d, reference); } catch { /* quotes not set up */ }
  if (!q || (q.postcode ?? "").toUpperCase().replace(/\s+/g, "") !== postcode) {
    await recordAttempt(d, [`claim:ip:${ip}`], false);
    return { ok: false, message: "We couldn't find a quote with that reference and postcode. Check the quote email, or call us." };
  }
  const email = normEmail(q.clientEmail);
  let a = await accountByEmail(d, email);
  if (!a) a = await createAccount(d, { email, name: q.clientName, role: "CLIENT" });
  if (!a || a.disabledAt) return { ok: false, message: "This account can't be used – please call us." };
  let r: { sent: boolean } | null = null;
  if (await recentTokens(d, email) < 5) {
    r = a.emailVerifiedAt ? await sendMagicLink(email, await createToken(d, "MAGIC", email, a.id))
      : await sendVerifyEmail(email, await createToken(d, "VERIFY", email, a.id), a.name);
  }
  if (r && !r.sent) return { ok: false, message: "We couldn't send the email just now. Please try again in a minute, or call us." };
  return { ok: true, sent: true, email: maskEmail(email), message: mailConfigured() ? "" : "We couldn't send the email right now – please call us." };
}

export async function signOut() {
  await endSession();
  redirect("/");
}
