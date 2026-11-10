// Password hashing and rules. scrypt (memory-hard, built into Node) – no extra packages.
// Stored as scrypt$<logN>$<r>$<p>$<salt b64>$<hash b64>, so the cost can be raised later
// and old hashes still verify (and are upgraded at the next sign-in).
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (pw: string, salt: Buffer, len: number, o: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, len, o, (e, k) => (e ? rej(e) : res(k))));

const LOG_N = 15, R = 8, P = 1, LEN = 64;
const opts = (logN: number, r: number, p: number): ScryptOptions => ({ N: 2 ** logN, r, p, maxmem: 128 * 2 ** logN * r * 2 });

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize("NFKC"), salt, LEN, opts(LOG_N, R, P));
  return `scrypt$${LOG_N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/** Constant-time check. `rehash` is true when the stored hash uses older (weaker) settings. */
export async function verifyPassword(pw: string, stored: string | null | undefined): Promise<{ ok: boolean; rehash: boolean }> {
  const parts = (stored ?? "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // Spend the same time as a real check, so missing accounts can't be told apart by timing.
    await scrypt(pw, Buffer.alloc(16), LEN, opts(LOG_N, R, P));
    return { ok: false, rehash: false };
  }
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(pw.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, opts(Number(n), Number(r), Number(p)));
  const ok = key.length === expected.length && timingSafeEqual(key, expected);
  return { ok, rehash: ok && (Number(n) < LOG_N || Number(r) !== R || Number(p) !== P) };
}

const COMMON = new Set(["password", "password1", "password123", "123456789", "1234567890", "qwertyuiop", "letmein123", "welcome123", "iloveyou12", "construction", "11111111111", "abcdefghij", "qwerty123456", "football123", "monkey12345", "liverpool1", "arsenal123", "chelsea123"]);

/** Problems with a new password (empty = fine). Follows NCSC guidance: length over complexity, no common passwords. */
export function passwordProblems(pw: string, email = "", name = ""): string[] {
  const out: string[] = [];
  if (pw.length < 10) out.push("Use at least 10 characters");
  if (pw.length > 200) out.push("Use at most 200 characters");
  if (/^(.)\1+$/.test(pw)) out.push("Don't repeat one character");
  if (COMMON.has(pw.toLowerCase())) out.push("That password is too common");
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && pw.toLowerCase().includes(local)) out.push("Don't include your email address");
  if (name && name.trim().length >= 4 && pw.toLowerCase().includes(name.trim().toLowerCase())) out.push("Don't include your name");
  if (pw.length >= 10 && new Set(pw).size < 5) out.push("Use more different characters");
  return out;
}

/** Rules for Safari / iOS Keychain's strong-password generator (passwordrules attribute). */
export const PASSWORD_RULES = "minlength: 12; maxlength: 64; required: lower; required: upper; required: digit; required: [-!@#$%&*?];";

/** Random URL-safe token and the SHA-256 we store instead of it. */
export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, id: sha256(token) };
}
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Only same-site paths for redirects after sign-in (no //evil.com, no scheme). */
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.length > 500) return fallback;
  try { const u = new URL(next, "https://x.invalid"); return u.origin === "https://x.invalid" ? u.pathname + u.search + u.hash : fallback; } catch { return fallback; }
}

export const normEmail = (e: string) => e.trim().toLowerCase().normalize("NFKC");
export const validEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);
