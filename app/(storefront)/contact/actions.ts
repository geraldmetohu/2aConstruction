"use server";
import { officeInbox, sendMail } from "@/app/lib/takeoff/mail.server";
import { z } from "zod";

export type EnquiryState = { ok: boolean; message: string; errors?: Record<string, string> };

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please check your email address").max(160),
  phone: z.string().trim().max(40).optional().default(""),
  postcode: z.string().trim().max(12).optional().default(""),
  service: z.string().trim().max(60).optional().default(""),
  budget: z.string().trim().max(60).optional().default(""),
  timing: z.string().trim().max(60).optional().default(""),
  contactBy: z.string().trim().max(30).optional().default(""),
  message: z.string().trim().min(10, "Tell us a little about the project (at least 10 characters)").max(5000),
  reference: z.string().trim().max(200).optional().default(""),
});

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Website enquiry, emailed to the office (CONTACT_TO) through the site's mail sender (Resend). */
export async function sendEnquiry(_: EnquiryState, form: FormData): Promise<EnquiryState> {
  if (String(form.get("company") ?? "").trim()) return { ok: true, message: "Thanks, we'll be in touch." }; // bot trap
  const raw = Object.fromEntries(["name", "email", "phone", "postcode", "service", "budget", "timing", "contactBy", "message", "reference"].map(k => [k, String(form.get(k) ?? "")]));
  const p = schema.safeParse(raw);
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Please check the highlighted fields.", errors };
  }
  const v = p.data;
  const rows: [string, string][] = [
    ["Name", v.name], ["Email", v.email], ["Phone", v.phone], ["Postcode", v.postcode.toUpperCase()], ["Project type", v.service],
    ["Budget", v.budget], ["Timing", v.timing], ["Prefers", v.contactBy], ["Seen on site", v.reference],
  ].filter(([, x]) => x) as [string, string][];
  const text = ["New website enquiry", "", ...rows.map(([k, x]) => `${k}: ${x}`), "", "Message:", v.message].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;color:#071a33"><h2 style="margin:0 0 12px">New website enquiry</h2>
    <table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, x]) => `<tr><td style="color:#667"><b>${esc(k)}</b></td><td>${esc(x)}</td></tr>`).join("")}</table>
    <h3 style="margin:18px 0 6px">Message</h3><p style="white-space:pre-wrap">${esc(v.message)}</p></div>`;

  const to = officeInbox();
  if (!to.length) {
    console.error("[enquiry] CONTACT_TO / ADMIN_EMAILS not set");
    return { ok: false, message: "Sorry, our form isn't working right now. Please call or email us directly." };
  }
  try {
    const r = await sendMail({ to, replyTo: v.email, subject: `Enquiry: ${v.service || "New project"} – ${v.name}${v.postcode ? ` (${v.postcode.toUpperCase()})` : ""}`, text, html });
    if (!r.sent) throw new Error(r.reason);
    return { ok: true, message: "Thank you. We've received your enquiry and will be in touch within one working day." };
  } catch (e) {
    console.error("[enquiry] send failed", e);
    return { ok: false, message: "Sorry, that didn't send. Please call or email us directly." };
  }
}
