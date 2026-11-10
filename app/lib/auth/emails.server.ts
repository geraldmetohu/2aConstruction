import "server-only";
import { headers } from "next/headers";
import { brandEmail, sendMail as send, siteUrl } from "@/app/lib/takeoff/mail.server";

const dev = process.env.NODE_ENV !== "production";
/** Links point back to the site the person is using (localhost while testing; the live address in production). */
async function origin() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host && (dev || !siteUrl())) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`;
  } catch { /* not in a request */ }
  return siteUrl();
}
const link = (base: string, path: string, token: string) => `${base}${path}?token=${encodeURIComponent(token)}`;

/** Send, and while testing locally also print the link in the terminal so you can sign in even if email isn't working. */
async function sendMail(m: Parameters<typeof send>[0] & { link?: string }) {
  const r = await send(m);
  if (dev) console.info(`\n[auth] ${m.subject} → ${m.to}\n[auth] ${r.sent ? "email sent" : `email NOT sent: ${r.reason}`}${m.link ? `\n[auth] link: ${m.link}` : ""}\n`);
  else if (!r.sent) console.error(`[auth] email to ${m.to} not sent: ${r.reason}`);
  return r;
}

export async function sendVerifyEmail(to: string, token: string, name = "") {
  const b = await origin();
  const m = brandEmail({ heading: `Welcome${name ? `, ${name.split(" ")[0]}` : ""} – confirm your email`, paragraphs: ["Click the button to confirm your email address and choose your password. Then you can see your quotes, sign them, follow your project and pay stage invoices online."],
    button: { label: "Confirm email & set password", url: link(b, "/verify-email", token) }, footnote: "The link works for 24 hours. If you didn't ask for an account, ignore this email." });
  return sendMail({ to, subject: "Confirm your email – 2A Construction", ...m, link: m.text.match(/https?:\/\/\S+token=\S+/)?.[0] });
}
export async function sendResetEmail(to: string, token: string) {
  const b = await origin();
  const m = brandEmail({ heading: "Choose a new password", paragraphs: ["Someone (hopefully you) asked to reset the password for your 2A Construction account. Click the button to choose a new one. If you used to sign in through our old sign-in page, this is also how you set your password for the new one."],
    button: { label: "Choose a new password", url: link(b, "/reset-password", token) }, footnote: "The link works for 1 hour. If you didn't ask for this, you can ignore it – your password stays the same." });
  return sendMail({ to, subject: "Reset your password – 2A Construction", ...m, link: m.text.match(/https?:\/\/\S+token=\S+/)?.[0] });
}
export async function sendMagicLink(to: string, token: string) {
  const b = await origin();
  const m = brandEmail({ heading: "Your sign-in link", paragraphs: ["Click the button to sign in to your 2A Construction account – no password needed."],
    button: { label: "Sign in", url: link(b, "/email-sign-in", token) }, footnote: "The link works for 15 minutes and only once. If you didn't ask for it, ignore this email." });
  return sendMail({ to, subject: "Sign in to 2A Construction", ...m, link: m.text.match(/https?:\/\/\S+token=\S+/)?.[0] });
}
export async function sendInvite(to: string, token: string, role: string, name = "") {
  const b = await origin();
  const m = brandEmail({ heading: `${name ? `${name.split(" ")[0]}, you're` : "You're"} invited to 2A Construction`, paragraphs: [`We've set up your ${role.toLowerCase()} account. Click the button to choose your password – then you can sign in any time with your email, Google, or a link we email you.`],
    button: { label: "Set my password", url: link(b, "/verify-email", token) }, footnote: "The link works for 7 days." });
  return sendMail({ to, subject: "Your 2A Construction account", ...m, link: m.text.match(/https?:\/\/\S+token=\S+/)?.[0] });
}
export async function sendAlreadyRegistered(to: string, token: string) {
  const b = await origin();
  const m = brandEmail({ heading: "You already have an account", paragraphs: ["Someone tried to create a 2A Construction account with this email, but you already have one. If it was you, sign in – or choose a new password with the button below."],
    button: { label: "Choose a new password", url: link(b, "/reset-password", token) }, footnote: "If it wasn't you, ignore this email – nothing has changed." });
  return sendMail({ to, subject: "Your 2A Construction account", ...m, link: m.text.match(/https?:\/\/\S+token=\S+/)?.[0] });
}
