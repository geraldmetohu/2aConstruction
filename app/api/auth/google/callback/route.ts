import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { GOOGLE_COOKIE, googleConfigured, googleFinish } from "@/app/lib/auth/google.server";
import { safeNext } from "@/app/lib/auth/password";
import { accountByEmail, accountByGoogle, authReady, createAccount, updateAccount } from "@/app/lib/auth/store";
import { currentAccount, db, effectiveRole, homeFor, startSession } from "@/app/lib/auth/session.server";

export const dynamic = "force-dynamic";

/**
 * Google sends the person back here. Check the state, swap the code (with the PKCE verifier) for their profile, then:
 * signed in already → link Google to that account; known Google id → sign in; known (verified) email → link and sign in;
 * otherwise create a client account. Google must say the email is verified.
 */
export async function GET(req: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
  if (!googleConfigured()) return fail("google-off");
  const jar = await cookies();
  const raw = jar.get(GOOGLE_COOKIE)?.value;
  jar.set(GOOGLE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  let saved: { state?: string; verifier?: string; next?: string } = {};
  try { saved = JSON.parse(raw ?? "{}"); } catch { /* ignore */ }
  const state = req.nextUrl.searchParams.get("state"), code = req.nextUrl.searchParams.get("code");
  if (req.nextUrl.searchParams.get("error")) return fail("google-cancelled");
  if (!code || !state || !saved.state || state !== saved.state || !saved.verifier) return fail("google-state");
  const d = db();
  if (!(await authReady(d))) return fail("not-ready");

  let p;
  try { p = await googleFinish(code, saved.verifier, req.nextUrl.origin); } catch { return fail("google-failed"); }
  if (!p.emailVerified) return fail("google-unverified");

  const signedIn = await currentAccount();
  let a = await accountByGoogle(d, p.sub);
  if (signedIn && !a) {
    // Connecting Google from the Account page.
    await updateAccount(d, signedIn.id, { googleSub: p.sub, ...(signedIn.avatarUrl ? {} : p.picture ? { avatarUrl: p.picture } : {}) });
    return NextResponse.redirect(new URL("/account?google=linked", req.url));
  }
  if (!a) {
    const byEmail = await accountByEmail(d, p.email);
    if (byEmail) { await updateAccount(d, byEmail.id, { googleSub: p.sub, verified: true, ...(byEmail.avatarUrl || !p.picture ? {} : { avatarUrl: p.picture }), ...(byEmail.name ? {} : { name: p.name }) }); a = await accountByGoogle(d, p.sub); }
    else a = await createAccount(d, { email: p.email, name: p.name, role: "CLIENT", verified: true, googleSub: p.sub, avatarUrl: p.picture });
  }
  if (!a || a.disabledAt) return fail("disabled");
  const verified = { ...a, emailVerifiedAt: a.emailVerifiedAt ?? new Date() };
  await startSession(verified, "GOOGLE");
  return NextResponse.redirect(new URL(homeFor(effectiveRole(verified), safeNext(saved.next, "")), req.url));
}
