import "server-only";
import { brandEmail, mailConfigured, officeInbox, sendMail, siteUrl } from "./mail.server";
import { getQuote, type Sql } from "./store";

/**
 * Automatic emails for everything that happens on a job after the quote is accepted – to the client when we do
 * something they should know about, and to the office when the client does something we must act on.
 * They never throw and never hold up the action: a failed email is logged and the portal still shows everything.
 */
const base = () => siteUrl() || "https://2aconstruction.co.uk";
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ukDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const clip = (s: string, n = 600) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Who = { reference: string; clientName: string; clientEmail: string; siteAddress: string; status: string };
async function who(db: Sql, quoteId: string): Promise<Who | null> {
  try { const q = await getQuote(db, quoteId); return q ? { reference: q.quote.reference, clientName: q.quote.clientName, clientEmail: q.quote.clientEmail, siteAddress: q.quote.siteAddress, status: q.quote.status } : null; }
  catch (e) { console.error("[notify] quote", e); return null; }
}
async function attempt(label: string, fn: () => Promise<unknown>) {
  if (!mailConfigured()) return;
  try { await fn(); } catch (e) { console.error(`[notify] ${label}`, e); }
}

export type ClientEvent =
  | { kind: "START_DATE"; date: string; changed: boolean }
  | { kind: "STARTED" }
  | { kind: "ON_HOLD" }
  | { kind: "COMPLETED"; guaranteeYears?: number }
  | { kind: "STAGE_DONE"; label: string; note?: string }
  | { kind: "MESSAGE"; text: string }
  | { kind: "REQUEST"; title: string; detail: string; dueDate: string | null; variation: boolean }
  | { kind: "PAYMENT_CONFIRMED"; amount: number; paidOn: string }
  | { kind: "PAYMENT_NOT_FOUND"; amount: number; paidOn: string }
  | { kind: "SNAG_FIXED"; title: string }
  | { kind: "DOCUMENTS"; titles: string[] }
  | { kind: "PHOTOS"; count: number }
  | { kind: "MANAGER"; name: string; phone: string; email: string };

/** Tell the client (by email) about something we did on their project. */
export async function notifyClient(db: Sql, quoteId: string, e: ClientEvent) {
  await attempt(`client ${e.kind}`, async () => {
    // The client only has a project page once they've accepted; before that, nothing is emailed.
    const q = await who(db, quoteId); if (!q || q.status !== "ACCEPTED") return;
    const project = `${base()}/my-quotes/${quoteId}`;
    const hi = `Hi ${first(q.clientName)}`;
    const m = ((): { subject: string; heading: string; paragraphs: string[]; button: { label: string; url: string } } => {
      switch (e.kind) {
        case "START_DATE": return { subject: `Your start date: ${ukDate(e.date)} (${q.reference})`, heading: `${hi}, your start date is ${e.changed ? "changed" : "confirmed"}`,
          paragraphs: [`We'll start on ${ukDate(e.date)}.`, "Your programme and payment dates have been updated to match. If anything about access, parking or keys has changed, please update “Your details” in your project page."], button: { label: "See my programme", url: project } };
        case "STARTED": return { subject: `Work has started (${q.reference})`, heading: `${hi}, work has started`,
          paragraphs: ["The team is on site. You'll see progress by stage, photos and any questions for you in your project page as we go."], button: { label: "Follow my project", url: project } };
        case "ON_HOLD": return { subject: `Your project is on hold (${q.reference})`, heading: `${hi}, your project is on hold for now`,
          paragraphs: ["We've paused work on your project. We'll be in touch to explain and agree when we restart – any questions, just reply or call us."], button: { label: "Open my project", url: project } };
        case "COMPLETED": return { subject: `Your project is complete – thank you (${q.reference})`, heading: `${hi}, your project is complete`,
          paragraphs: ["Thank you for choosing 2A Construction. Your certificates, guarantee and documents are in your project page.",
            `Spotted anything that isn't right? Add it to the snagging list in your project page and we'll put it right.${e.guaranteeYears ? ` Your ${e.guaranteeYears}-year workmanship guarantee starts today.` : ""}`,
            "If you're happy with the work, a short review would mean a lot to our small team."], button: { label: "Open my project", url: `${project}?tab=snags` } };
        case "STAGE_DONE": return { subject: `Stage complete: ${e.label} (${q.reference})`, heading: `${hi}, another stage is done`,
          paragraphs: [`${e.label} is complete.${e.note ? ` ${clip(e.note, 300)}` : ""}`, "See the progress, photos and what's next in your project page."], button: { label: "See progress", url: project } };
        case "MESSAGE": return { subject: `New message about your project (${q.reference})`, heading: `${hi}, you have a new message`,
          paragraphs: [`“${clip(e.text)}”`, "Reply in your project page so the whole team sees it."], button: { label: "Reply", url: `${project}?tab=messages` } };
        case "REQUEST": return e.variation
          ? { subject: `A change to approve (${q.reference})`, heading: `${hi}, please approve or decline a change`,
            paragraphs: [`${e.title}${e.dueDate ? ` – please reply by ${ukDate(e.dueDate)}` : ""}.`, clip(e.detail), "Nothing changes on your contract until you approve it."].filter(Boolean), button: { label: "Review the change", url: `${project}?tab=todo` } }
          : { subject: `We need something from you (${q.reference})`, heading: `${hi}, a quick question from us`,
            paragraphs: [`${e.title}${e.dueDate ? ` – by ${ukDate(e.dueDate)}` : ""}.`, clip(e.detail)].filter(Boolean), button: { label: "Answer", url: `${project}?tab=todo` } };
        case "PAYMENT_CONFIRMED": return { subject: `Payment received – thank you (${q.reference})`, heading: `${hi}, we've received your payment`,
          paragraphs: [`${gbp(e.amount)} paid on ${ukDate(e.paidOn)} has reached our account. Thank you.`, "Your payment schedule in your project page shows what's paid and what's next."], button: { label: "See my payments", url: `${project}?tab=payments` } };
        case "PAYMENT_NOT_FOUND": return { subject: `We couldn't find your payment (${q.reference})`, heading: `${hi}, we couldn't match a payment`,
          paragraphs: [`We haven't been able to find the ${gbp(e.amount)} you told us about (${ukDate(e.paidOn)}). It may still be on its way – please check the reference and our bank details, or give us a call.`, "We will never ask you to change our bank details by email."], button: { label: "See my payments", url: `${project}?tab=payments` } };
        case "SNAG_FIXED": return { subject: `Snag fixed: ${e.title} (${q.reference})`, heading: `${hi}, we've fixed a snag`,
          paragraphs: [`“${clip(e.title, 200)}” is marked as done. Please take a look – if you're not happy, reopen it in your project page.`], button: { label: "Check the snagging list", url: `${project}?tab=snags` } };
        case "DOCUMENTS": return { subject: `New documents for your project (${q.reference})`, heading: `${hi}, we've shared ${e.titles.length === 1 ? "a document" : `${e.titles.length} documents`}`,
          paragraphs: [e.titles.slice(0, 8).join(", ") + (e.titles.length > 8 ? "…" : ""), "You'll find them under “Quote & documents” in your project page."], button: { label: "Open documents", url: `${project}?tab=quote` } };
        case "PHOTOS": return { subject: `New site photos (${q.reference})`, heading: `${hi}, new photos from site`,
          paragraphs: [`We've added ${e.count === 1 ? "a photo" : `${e.count} photos`} of your project.`], button: { label: "See the photos", url: `${project}?tab=photos` } };
        case "MANAGER": return { subject: `Your project manager (${q.reference})`, heading: `${hi}, meet your project manager`,
          paragraphs: [`${e.name} is your project manager and your main contact while we work${e.phone ? ` – ${e.phone}` : ""}${e.email ? `, ${e.email}` : ""}.`], button: { label: "Open my project", url: project } };
      }
    })();
    await sendMail({ to: q.clientEmail, subject: m.subject, ...brandEmail({ heading: m.heading, paragraphs: m.paragraphs, button: m.button, footnote: `Reference ${q.reference}${q.siteAddress ? ` · ${q.siteAddress.replace(/\n/g, ", ")}` : ""}.` }) });
  });
}

export type OfficeEvent =
  | { kind: "MESSAGE"; text: string; note: boolean }
  | { kind: "ANSWER"; title: string; response: string; variation: boolean }
  | { kind: "PAYMENT_REPORTED"; amount: number; paidOn: string; reference: string }
  | { kind: "SNAG"; title: string; location: string }
  | { kind: "SNAG_REOPENED"; title: string }
  | { kind: "SUPPLY"; label: string; status: string }
  | { kind: "QUOTE_SENT"; emailed: boolean; pdf?: Buffer | null };

/** Tell the office (CONTACT_TO / ADMIN_EMAILS) about something the client did that needs us. */
export async function notifyOffice(db: Sql, quoteId: string, e: OfficeEvent) {
  await attempt(`office ${e.kind}`, async () => {
    const to = officeInbox(); if (!to.length) return;
    const q = await who(db, quoteId); if (!q) return;
    const job = `${base()}/dashboard/jobs/${quoteId}`;
    const c = `${q.clientName} (${q.reference})`;
    const m = ((): { subject: string; heading: string; paragraphs: string[]; button: { label: string; url: string } } => {
      switch (e.kind) {
        case "MESSAGE": return { subject: `${e.note ? "Note" : "Message"} from ${c}`, heading: `${q.clientName} sent a ${e.note ? "note for the team" : "message"}`, paragraphs: [`“${clip(e.text, 1500)}”`], button: { label: "Reply", url: `${job}?tab=client` } };
        case "ANSWER": return e.variation
          ? { subject: `Change ${/^APPROVED/.test(e.response) ? "APPROVED" : "declined"}: ${e.title} – ${c}`, heading: `${q.clientName} ${/^APPROVED/.test(e.response) ? "approved" : "declined"} a change`, paragraphs: [e.title, /^APPROVED/.test(e.response) ? "It's now added to their payment schedule." : "Carry on as originally agreed."], button: { label: "Open the job", url: `${job}?tab=client` } }
          : { subject: `Answer from ${c}: ${e.title}`, heading: `${q.clientName} answered`, paragraphs: [e.title, `“${clip(e.response, 1500)}”`], button: { label: "Open the job", url: `${job}?tab=client` } };
        case "PAYMENT_REPORTED": return { subject: `Payment to confirm: ${gbp(e.amount)} – ${c}`, heading: `${q.clientName} says they've paid`, paragraphs: [`${gbp(e.amount)} on ${ukDate(e.paidOn)}${e.reference ? `, reference ${e.reference}` : ""}.`, "Check the bank and press “Confirm received” – the client is told automatically."], button: { label: "Confirm the payment", url: `${job}?tab=money` } };
        case "SNAG": return { subject: `Snag raised by ${c}: ${e.title}`, heading: `${q.clientName} added a snag`, paragraphs: [`${e.title}${e.location ? ` (${e.location})` : ""}`], button: { label: "Open the snagging list", url: `${job}?tab=snags` } };
        case "SNAG_REOPENED": return { subject: `Snag reopened by ${c}: ${e.title}`, heading: `${q.clientName} reopened a snag`, paragraphs: [`“${e.title}” isn't right yet – please take another look.`], button: { label: "Open the snagging list", url: `${job}?tab=snags` } };
        case "SUPPLY": return { subject: `${e.label}: ${e.status.toLowerCase().replace("_", " ")} – ${c}`, heading: `${q.clientName} updated an item they supply`, paragraphs: [`${e.label} is now ${e.status === "DELIVERED" ? "delivered to site" : e.status === "ORDERED" ? "ordered" : "still to order"}.`], button: { label: "Open the job", url: `${job}?tab=orders` } };
        case "QUOTE_SENT": return { subject: `Quote sent: ${q.reference} – ${q.clientName}`, heading: `Quote ${q.reference} sent`, paragraphs: [`To ${q.clientName} (${q.clientEmail})${q.siteAddress ? ` for ${q.siteAddress.replace(/\n/g, ", ")}` : ""}.`, e.emailed ? "The client has been emailed the quotation (PDF attached here for your records)." : "The client email did NOT go out – send them the link to their client area, or the attached PDF."], button: { label: "Open the quote", url: `${base()}/dashboard/calculator?quote=${quoteId}` } };
      }
    })();
    const attachments = e.kind === "QUOTE_SENT" && e.pdf ? [{ filename: `Quotation ${q.reference}.pdf`, content: e.pdf, contentType: "application/pdf" }] : undefined;
    await sendMail({ to, ...(e.kind === "MESSAGE" || e.kind === "ANSWER" ? { replyTo: q.clientEmail } : {}), ...(attachments ? { attachments } : {}), subject: m.subject, ...brandEmail({ heading: m.heading, paragraphs: m.paragraphs, button: m.button, footnote: q.siteAddress ? `Site: ${q.siteAddress.replace(/\n/g, ", ")}` : undefined }) });
  });
}
