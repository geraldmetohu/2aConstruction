import "server-only";
import nodemailer from "nodemailer";

/**
 * Automated emails (daily digest, reminders, check-in links). Configure SMTP_URL
 * (e.g. smtps://user:pass@smtp.gmail.com:465) or SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS, and MAIL_FROM.
 * Without these, nothing is sent and the app shows the information on screen only.
 */
export function mailConfigured() {
  return !!(process.env.SMTP_URL || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
}

export async function sendMail(m: { to: string | string[]; subject: string; text: string; html?: string; attachments?: { filename: string; content: Buffer; contentType?: string }[] }) {
  if (!mailConfigured()) return { sent: false as const, reason: "Email is not set up (SMTP settings missing)." };
  const to = (Array.isArray(m.to) ? m.to : [m.to]).map(x => x.trim()).filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  if (!to.length) return { sent: false as const, reason: "No valid email address." };
  // Short timeouts so a slow or unreachable mail server never holds up the page that triggered the email.
  const timeouts = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 };
  const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL)
    : nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, ...timeouts });
  try {
    await transport.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject: m.subject, text: m.text, html: m.html, ...(m.attachments?.length ? { attachments: m.attachments } : {}) });
    return { sent: true as const };
  } catch (e) {
    console.error("[mail] send failed", e);
    return { sent: false as const, reason: e instanceof Error ? e.message : "Email failed." };
  }
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.KINDE_SITE_URL || "").replace(/\/$/, "");

/** Where office notifications go: CONTACT_TO, else ADMIN_EMAILS, else the SMTP account itself. */
export function officeInbox(): string[] {
  const list = (process.env.CONTACT_TO || process.env.ADMIN_EMAILS || process.env.SMTP_USER || "").split(/[,;\s]+/).filter(Boolean);
  return [...new Set(list)];
}

const escHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** A simple branded email (navy header, yellow button) with a plain-text twin. */
export function brandEmail(m: { heading: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string }) {
  const text = [m.heading, "", ...m.paragraphs.flatMap(p => [p, ""]), ...(m.button ? [`${m.button.label}: ${m.button.url}`, ""] : []), m.footnote ?? "", "2A Construction Ltd"].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#071a33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#071a33;padding:22px 28px"><span style="font-size:13px;letter-spacing:3px;font-weight:700;color:#f5b400">2A CONSTRUCTION</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3">${escHtml(m.heading)}</h1>
${m.paragraphs.map(p => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#33415c">${escHtml(p)}</p>`).join("")}
${m.button ? `<p style="margin:22px 0"><a href="${escHtml(m.button.url)}" style="display:inline-block;background:#f5b400;color:#071a33;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:8px">${escHtml(m.button.label)}</a></p>` : ""}
${m.footnote ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#6b7690">${escHtml(m.footnote)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8f9fb;font-size:12px;color:#6b7690">2A Construction Ltd · London &amp; the South East</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}
