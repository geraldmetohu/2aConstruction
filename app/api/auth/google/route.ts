import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_COOKIE, googleConfigured, googleStart } from "@/app/lib/auth/google.server";
import { safeNext } from "@/app/lib/auth/password";

export const dynamic = "force-dynamic";

/** Start "Continue with Google": remember state + PKCE verifier in a short-lived cookie and send the person to Google. */
export async function GET(req: NextRequest) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=google-off", req.url));
  const next = safeNext(req.nextUrl.searchParams.get("next"), "");
  const { url, cookie } = googleStart(req.nextUrl.origin, next);
  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600 });
  return res;
}
