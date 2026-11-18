// Builds the marketing email (HTML and plain text). For a broadcast, {{first_name}} becomes Resend's
// personalisation tag and the unsubscribe link Resend's own; for a test email both are filled in.
import type { EmailContent } from "./templates";

export interface RenderOptions {
  base: string;
  company: { name: string; address: string; phone: string; email: string };
  mode: "broadcast" | "test";
  testFirstName?: string;
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const abs = (u: string, base: string) => (!u ? "" : /^https?:\/\//.test(u) ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}`);

export function renderMarketing(c: EmailContent, o: RenderOptions) {
  const first = o.mode === "broadcast" ? "{{{contact.first_name|there}}}" : esc(o.testFirstName || "there");
  const unsub = o.mode === "broadcast" ? "{{{RESEND_UNSUBSCRIBE_URL}}}" : `${o.base}/unsubscribe`;
  const fill = (s: string) => esc(s).replace(/\{\{\s*first_name\s*\}\}/g, first);
  const fillText = (s: string) => s.replace(/\{\{\s*first_name\s*\}\}/g, o.mode === "broadcast" ? "{{{contact.first_name|there}}}" : o.testFirstName || "there");
  const img = abs(c.imageUrl, o.base), btn = abs(c.buttonUrl, o.base);
  const paras = c.paragraphs.map(p => p.trim()).filter(Boolean);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title></head>
<body style="margin:0;background:#f4f5f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#071a33">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${fill(c.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#071a33;padding:22px 28px"><a href="${esc(o.base)}" style="font-size:13px;letter-spacing:3px;font-weight:700;color:#f5b400;text-decoration:none">2A CONSTRUCTION</a></td></tr>
${img ? `<tr><td><img src="${esc(img)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : ""}
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#071a33">${fill(c.heading)}</h1>
${paras.map(p => `<p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#33415c">${fill(p).replace(/\n/g, "<br>")}</p>`).join("")}
${c.bullets.filter(b => b.trim()).length ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 16px">${c.bullets.filter(b => b.trim()).map(b => `<tr><td style="vertical-align:top;padding:4px 10px 4px 0;color:#f5b400;font-size:16px">&#10004;</td><td style="padding:4px 0;font-size:15px;line-height:1.5;color:#33415c">${fill(b)}</td></tr>`).join("")}</table>` : ""}
${c.buttonLabel && btn ? `<p style="margin:24px 0"><a href="${esc(btn)}" style="display:inline-block;background:#f5b400;color:#071a33;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:8px">${fill(c.buttonLabel)}</a></p>` : ""}
<p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#33415c">${fill(c.signOff).replace(/\n/g, "<br>")}</p>
</td></tr>
<tr><td style="padding:18px 28px;background:#f8f9fb;font-size:12px;line-height:1.6;color:#6b7690">
${esc(o.company.name)}${o.company.address ? ` · ${esc(o.company.address)}` : ""}${o.company.phone ? ` · ${esc(o.company.phone)}` : ""}<br>
You're receiving this because you asked us for a quote or told us you'd like to hear from us. <a href="${unsub}" style="color:#6b7690">Unsubscribe</a> – one click, and you won't get marketing emails from us again.
</td></tr></table></td></tr></table></body></html>`;
  const text = [fillText(c.heading), "", ...paras.map(fillText).flatMap(p => [p, ""]), ...c.bullets.filter(b => b.trim()).map(b => `• ${fillText(b)}`), ...(c.bullets.length ? [""] : []),
    ...(c.buttonLabel && btn ? [`${fillText(c.buttonLabel)}: ${btn}`, ""] : []), fillText(c.signOff), "", "—", `${o.company.name}${o.company.address ? `, ${o.company.address}` : ""}`,
    `You're receiving this because you asked us for a quote or told us you'd like to hear from us. Unsubscribe: ${unsub}`].join("\n");
  return { html, text, subject: c.subject.replace(/\{\{\s*first_name\s*\}\}/g, o.mode === "broadcast" ? "{{{contact.first_name|there}}}" : o.testFirstName || "there") };
}
