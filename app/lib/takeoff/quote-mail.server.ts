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

export async function emailQuoteAccepted(q: { quoteId: string; reference: string; siteAddress: string; clientEmail: string; acceptedName: string; version: number; requestedStart?: string | null }) {
  const office = officeInbox();
  const toOffice = office.length ? safe(() => sendMail({
    to: office,
    subject: `Quote accepted: ${q.reference} – ${q.acceptedName}`,
    ...brandEmail({
      heading: "A client has accepted a quote",
      paragraphs: [`${q.acceptedName} (${q.clientEmail}) accepted version ${q.version} of ${q.reference}.`, q.siteAddress ? `Site: ${q.siteAddress}` : "", q.requestedStart ? `They would like to start from ${q.requestedStart}.` : "", "The job is now in Dashboard → Jobs. Next: agree the start date and send the deposit request."].filter(Boolean),
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

const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ukDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * A stage invoice has been raised: the client gets it as a PDF with a link to view it and mark it paid,
 * and the office (CONTACT_TO / ADMIN_EMAILS) gets a copy with the same PDF for the books.
 * `sent` is the client email; the office copy never blocks it.
 */
export async function emailInvoice(i: { quoteId: string; reference: string; clientName: string; clientEmail: string; number: string; label: string; gross: number; dueOn: string; pdf?: Buffer | null }) {
  const attachments = i.pdf ? [{ filename: `Invoice ${i.number}.pdf`, content: i.pdf, contentType: "application/pdf" }] : undefined;
  const client = await safe(() => sendMail({
    to: i.clientEmail,
    subject: `Invoice ${i.number} – ${i.label} (${i.reference})`,
    ...(attachments ? { attachments } : {}),
    ...brandEmail({
      heading: `Hi ${first(i.clientName)}, your invoice is ready`,
      paragraphs: [
        `${i.label}: ${gbp(i.gross)} including VAT, due by ${ukDate(i.dueOn)}.`,
        `${attachments ? "The invoice is attached as a PDF. " : ""}You can also view it, see our bank details and tell us once you've paid in your client area.`,
        "We will never ask you to change our bank details by email. If in doubt, call us before paying.",
      ],
      button: { label: "View invoice", url: `${link(i.quoteId)}/invoices/${encodeURIComponent(i.number)}` },
      footnote: `Reference ${i.reference}.`,
    }),
  }));
  const office = officeInbox();
  if (office.length) await safe(() => sendMail({
    to: office,
    subject: `Invoice issued: ${i.number} – ${i.clientName} – ${gbp(i.gross)}`,
    ...(attachments ? { attachments } : {}),
    ...brandEmail({
      heading: `Invoice ${i.number} issued`,
      paragraphs: [
        `${i.label} for ${i.clientName} (${i.clientEmail}): ${gbp(i.gross)} including VAT, due by ${ukDate(i.dueOn)}.`,
        client.sent ? "The client has been emailed a copy (attached here too)." : `The client email did NOT go out${client.reason ? ` (${client.reason})` : ""} – they can still see it in their portal. Send them the attached PDF if needed.`,
      ],
      button: { label: "Open the job", url: `${siteUrl() || "https://2aconstruction.co.uk"}/dashboard/jobs/${i.quoteId}?tab=money` },
      footnote: `Contract ${i.reference}.`,
    }),
  }));
  return client;
}
