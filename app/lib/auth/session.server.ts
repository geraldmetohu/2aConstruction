import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { authReady, createSession, revokeSession, SESSION_MAX_DAYS, sessionAccount, updateAccount, type Account, type Role } from "./store";

/** __Host- cookies can't be set by subdomains or over http – used in production. */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-2a_session" : "2a_session";
export const db = () => prismaDb(prisma);

const adminEmails = () => (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
/** Admins are the people in ADMIN_EMAILS (as before), and only once their email is verified. */
export const isAdminAccount = (a: Pick<Account, "email" | "role" | "emailVerifiedAt">) => !!a.emailVerifiedAt && adminEmails().includes(a.email);
export const effectiveRole = (a: Pick<Account, "email" | "role" | "emailVerifiedAt">): Role => (isAdminAccount(a) ? "ADMIN" : a.role === "ADMIN" ? "CLIENT" : a.role);

/** The signed-in person, in the same shape the pages used from Kinde (id, email, given_name…), plus role and trade. */
export interface SessionUser {
  id: string; accountId: string; email: string; given_name: string | null; family_name: string | null; picture: string | null; name: string; phone: string;
  role: Role; trade: string | null; hasPassword: boolean; google: boolean;
}

export const currentAccount = cache(async (): Promise<(Account & { sessionId: string }) | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const d = db();
    if (!(await authReady(d))) return null;
    return await sessionAccount(d, token);
  } catch { return null; }
});

export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const a = await currentAccount();
  if (!a || !a.emailVerifiedAt) return null;
  const [given, ...rest] = a.name.trim().split(/\s+/);
  return {
    id: a.userId ?? a.id, accountId: a.id, email: a.email, given_name: given || null, family_name: rest.join(" ") || null, picture: a.avatarUrl, name: a.name, phone: a.phone,
    role: effectiveRole(a), trade: a.trade, hasPassword: !!a.passwordHash, google: !!a.googleSub,
  };
});

/** Drop-in for getKindeServerSession(): { getUser, isAuthenticated }. */
export function getAuthSession() {
  return { getUser: () => currentUser(), isAuthenticated: async () => !!(await currentUser()) };
}

async function requestMeta() {
  const h = await headers();
  return { userAgent: h.get("user-agent") ?? "", ip: (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() };
}
export async function clientIp() { return (await requestMeta()).ip || "unknown"; }

/**
 * Start a session for a verified account: link it to the site's User record (the id the rest of the app uses),
 * set the cookie, record the sign-in.
 */
export async function startSession(a: Account, method: "PASSWORD" | "GOOGLE" | "EMAIL_LINK" | "NEW_PASSWORD") {
  const d = db();
  const userId = await ensureSiteUser(a);
  const token = await createSession(d, a.id, { ...(await requestMeta()), method });
  await updateAccount(d, a.id, { loggedIn: true, ...(userId !== a.userId ? { userId } : {}) });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_DAYS * 86400 });
  return token;
}

export async function endSession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) { try { await revokeSession(db(), token); } catch { /* already gone */ } }
  c.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
export async function currentToken() { return (await cookies()).get(SESSION_COOKIE)?.value; }

/**
 * The id in the site's existing "User" table. Existing customers (from the old Kinde sign-in) are matched by email,
 * so their projects stay linked; new people get a new User row. Nothing existing is changed or removed.
 */
async function ensureSiteUser(a: Account): Promise<string> {
  if (a.userId) {
    const ok = await prisma.user.findUnique({ where: { id: a.userId }, select: { id: true } }).catch(() => null);
    if (ok) return a.userId;
  }
  const existing = await prisma.user.findFirst({ where: { email: { equals: a.email, mode: "insensitive" } }, select: { id: true }, orderBy: { createdAt: "asc" } }).catch(() => null);
  if (existing) return existing.id;
  const [first, ...rest] = (a.name || a.email.split("@")[0]).trim().split(/\s+/);
  const id = `u_${a.id.replace(/-/g, "")}`;
  await prisma.user.create({ data: { id, email: a.email, firstName: first ?? "", lastName: rest.join(" "), profileImage: a.avatarUrl ?? `https://avatar.vercel.sh/${encodeURIComponent(first ?? "user")}` } }).catch(() => null);
  return id;
}

/** Where to go after signing in. */
export function homeFor(role: Role, next?: string | null) {
  if (next && next !== "/" && !next.startsWith("/login") && !next.startsWith("/signup")) return next;
  return role === "ADMIN" ? "/dashboard" : role === "TRADE" || role === "STAFF" ? "/trade" : "/my-quotes";
}
