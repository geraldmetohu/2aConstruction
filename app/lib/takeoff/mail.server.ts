import "server-only";

/**
 * Every automated email (sign-in links, quotes, invoices, reminders, enquiries) goes out through one sender:
 * - Resend (preferred): RESEND_API_KEY and MAIL_FROM / RESEND_FROM, e.g. "2A Construction <quotes@2aconstruction.co.uk>"
 *   – the from-address must be on a domain verified in Resend.
 * - SMTP (fallback): SMTP_URL, or SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.
 * Without either, nothing is sent and the app shows the information on screen (and in the dev terminal) instead.
 */
const resendKey = () => { const k = process.env.RESEND_API_KEY?.trim(); return k && k.startsWith("re_") ? k : ""; };
const smtpConfigured = () => !!(process.env.SMTP_URL || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));

export function mailConfigured() {
  return !!resendKey() || smtpConfigured();
}

/** Who emails come from. With Resend this must be on the verified domain (never a gmail.com address). */
export function mailFrom() {
  const pick = [process.env.MAIL_FROM, process.env.RESEND_FROM, process.env.CONTACT_FROM, process.env.SMTP_USER].map(x => x?.trim()).filter(Boolean) as string[];
  if (resendKey()) return pick.find(f => !/@(gmail|googlemail|icloud|outlook|hotmail|yahoo)\./i.test(f)) ?? "2A Construction <quotes@2aconstruction.co.uk>";
  return pick[0] ?? "";
}

type Mail = { to: string | string[]; subject: string; text: string; html?: string; replyTo?: string; attachments?: { filename: string; content: Buffer; contentType?: string }[] };
type Sent = { sent: true } | { sent: false; reason: string };

export async function sendMail(m: Mail): Promise<Sent> {
  if (!mailConfigured()) return { sent: false as const, reason: "Email is not set up (RESEND_API_KEY missing)." };
  const to = (Array.isArray(m.to) ? m.to : [m.to]).map(x => x.trim()).filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  if (!to.length) return { sent: false as const, reason: "No valid email address." };
  const replyTo = m.replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.replyTo.trim()) ? m.replyTo.trim() : undefined;
  try {
    if (resendKey()) await viaResend({ ...m, to, replyTo });
    else await viaSmtp({ ...m, to, replyTo });
    return { sent: true as const };
  } catch (e) {
    console.error("[mail] send failed", e instanceof Error ? e.message : e);
    return { sent: false as const, reason: e instanceof Error ? e.message : "Email failed." };
  }
}

async function viaResend(m: Mail & { to: string[] }) {
  // Short timeout so a slow mail service never holds up the page that triggered the email.
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: ctrl.signal,
      headers: { Authorization: `Bearer ${resendKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mailFrom(), to: m.to, subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}), ...(m.replyTo ? { reply_to: m.replyTo } : {}),
        ...(m.attachments?.length ? { attachments: m.attachments.map(a => ({ filename: a.filename, content: a.content.toString("base64"), ...(a.contentType ? { content_type: a.contentType } : {}) })) } : {}),
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  } finally { clearTimeout(timer); }
}

async function viaSmtp(m: Mail & { to: string[] }) {
  const { default: nodemailer } = await import("nodemailer");
  const timeouts = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 };
  const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL)
    : nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587),
      // 465 = SSL from the start; 587 / 25 = STARTTLS. SMTP_SECURE overrides.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, ...timeouts });
  await transport.sendMail({ from: mailFrom(), to: m.to, subject: m.subject, text: m.text, html: m.html, replyTo: m.replyTo, ...(m.attachments?.length ? { attachments: m.attachments } : {}) });
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.KINDE_SITE_URL || "").replace(/\/$/, "");

/** Where office notifications (enquiries, acceptances) go: CONTACT_TO, else ADMIN_EMAILS, else the SMTP account. */
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
