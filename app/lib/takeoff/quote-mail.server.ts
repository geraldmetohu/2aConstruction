import "server-only";
import { brandEmail, mailConfigured, officeInbox, sendMail, siteUrl } from "./mail.server";

/**
 * Emails around a quote. They never throw: if email is not set up or the mail server
 * fails, the quote action still succeeds and the client still sees everything in their portal.
 */
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const link = (quoteId: string) => `${siteUrl() || "https://2aconstruction.co.uk"}/my-quotes/${quoteId}`;

async function safe(fn: () => Promise<{ sent: boolean; reason?: string }>) {
  if (!mailConfigured()) return { sent: false, reason: "Email is not set up." };
  try { return await fn(); } catch (e) { console.error("[quote-mail]", e); return { sent: false, reason: "Email failed." }; }
}

export function emailQuoteSent(q: { quoteId: string; reference: string; clientName: string; clientEmail: string; pdf?: Buffer | null }) {
  return safe(() => sendMail({
    to: q.clientEmail,
    ...(q.pdf ? { attachments: [{ filename: `Quotation ${q.reference}.pdf`, content: q.pdf, contentType: "application/pdf" }] } : {}),
    subject: `Your quotation from 2A Construction (${q.reference})`,
    ...brandEmail({
      heading: `Hi ${first(q.clientName)}, your quotation is ready`,
      paragraphs: [
        "Thank you for inviting us to quote. Your quotation is attached as a PDF, and the full version – with your contract, guarantee and health & safety documents – is waiting in your private client area.",
        "You can read the price breakdown and scope of works, choose your finishes and see the new price straight away, then accept online when you're happy.",
        `Sign in or create an account with this email address (${q.clientEmail}) to open it.`,
      ],
      button: { label: "View my quotation", url: link(q.quoteId) },
      footnote: `Reference ${q.reference}. Any questions, just reply to this email or give us a call.`,
    }),
  }));
}

export function emailQuoteUpdated(q: { quoteId: string; reference: string; clientName: string; clientEmail: string; reason: string }) {
  return safe(() => sendMail({
    to: q.clientEmail,
    subject: `Your quotation has been updated (${q.reference})`,
    ...brandEmail({
      heading: `Hi ${first(q.clientName)}, we've updated your quotation`,
      paragraphs: [`What changed: ${q.reason}`, "Please have a look at the latest version in your client area before accepting."],
      button: { label: "See the updated quote", url: link(q.quoteId) },
      footnote: `Reference ${q.reference}.`,
    }),
  }));
}

export async function emailQuoteAccepted(q: { quoteId: string; reference: string; siteAddress: string; clientEmail: string; acceptedName: string; version: number }) {
  const office = officeInbox();
  const toOffice = office.length ? safe(() => sendMail({
    to: office,
    subject: `Quote accepted: ${q.reference} – ${q.acceptedName}`,
    ...brandEmail({
      heading: "A client has accepted a quote",
      paragraphs: [`${q.acceptedName} (${q.clientEmail}) accepted version ${q.version} of ${q.reference}.`, q.siteAddress ? `Site: ${q.siteAddress}` : "", "The job is now in Dashboard → Jobs. Next: agree the start date and send the deposit request."].filter(Boolean),
      button: { label: "Open the job", url: `${siteUrl() || "https://2aconstruction.co.uk"}/dashboard/jobs/${q.quoteId}` },
    }),
  })) : Promise.resolve({ sent: false });
  const toClient = safe(() => sendMail({
    to: q.clientEmail,
    subject: `Thank you – quote ${q.reference} accepted`,
    ...brandEmail({
      heading: `Thank you, ${first(q.acceptedName)}`,
      paragraphs: [
        "We've received your acceptance. We'll be in touch shortly to confirm your start date and the deposit.",
        "Your client area is now your project page: progress, photos, payments, questions for you and all your documents in one place.",
      ],
      button: { label: "Open my project", url: link(q.quoteId) },
      footnote: `Reference ${q.reference}.`,
    }),
  }));
  return Promise.all([toOffice, toClient]);
}
