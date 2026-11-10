import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { siteUrl } from "@/app/lib/takeoff/mail.server";

/**
 * "Continue with Google" – OpenID Connect authorisation code flow with PKCE and a state cookie.
 * Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (Google Cloud console → APIs & Services → Credentials → OAuth client, Web).
 * Authorised redirect URI: <site>/api/auth/google/callback
 */
export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const GOOGLE_COOKIE = "2a_google_oauth";
export const redirectUri = (origin?: string) => `${siteUrl() || origin || ""}/api/auth/google/callback`;

export function googleStart(origin: string, next: string) {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(origin), response_type: "code", scope: "openid email profile",
    state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account",
  }).toString();
  return { url: url.toString(), cookie: JSON.stringify({ state, verifier, next }) };
}

export interface GoogleProfile { sub: string; email: string; emailVerified: boolean; name: string; picture: string | null }

/** Swap the code for tokens (server to server, over TLS) and read the profile from Google's userinfo endpoint. */
export async function googleFinish(code: string, verifier: string, origin: string, fetcher: typeof fetch = fetch): Promise<GoogleProfile> {
  const tok = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(origin), grant_type: "authorization_code", code_verifier: verifier }),
  });
  if (!tok.ok) throw new Error("Google sign-in failed (token)");
  const { access_token } = await tok.json() as { access_token?: string };
  if (!access_token) throw new Error("Google sign-in failed (no token)");
  const res = await fetcher("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error("Google sign-in failed (profile)");
  const p = await res.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!p.sub || !p.email) throw new Error("Google did not share an email address");
  return { sub: p.sub, email: p.email.trim().toLowerCase(), emailVerified: p.email_verified === true, name: p.name ?? "", picture: p.picture && /^https:\/\//.test(p.picture) ? p.picture : null };
}
