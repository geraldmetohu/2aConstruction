"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { getAuthSession } from "@/app/lib/auth/session.server";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { companyProfile } from "@/app/lib/takeoff/prices.server";
import { officeInbox, sendMail, senderAddress, siteUrl } from "@/app/lib/takeoff/mail.server";
import { getSetting, setSetting } from "@/app/lib/settings/app-settings";
import { marketingContacts, marketingReady, recordConsent, recordUnsubscribe, sendable } from "@/app/lib/marketing/contacts";
import { createCampaign, deleteTemplate, finishCampaign, saveTemplate } from "@/app/lib/marketing/campaigns";
import { renderMarketing } from "@/app/lib/marketing/render";
import { addToSegment, createSegment, marketingConfigured, removeFromSegment, ResendError, segmentContacts, sendBroadcast, unsubscribeContact } from "@/app/lib/marketing/resend.server";

type R<T = object> = ({ ok: true; message?: string } & T) | { ok: false; message: string };
const fail = (e: unknown): { ok: false; message: string } => ({ ok: false, message: e instanceof z.ZodError ? e.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") : e instanceof Error ? e.message : "Something went wrong." });
const db = () => prismaDb(prisma);
async function ready() {
  const actor = await requireCatalogueAdmin();
  if (!(await marketingReady(db()))) throw new Error("Marketing needs the database update 20261118130000_admin_tools (run npx prisma migrate deploy).");
  return actor;
}

const contentSchema = z.object({
  subject: z.string().trim().min(3, "Add a subject").max(150), preheader: z.string().trim().max(200), heading: z.string().trim().min(2, "Add a heading").max(150),
  paragraphs: z.array(z.string().max(3000)).max(12), bullets: z.array(z.string().max(300)).max(10),
  buttonLabel: z.string().trim().max(60), buttonUrl: z.string().trim().max(500).refine(u => !u || /^\/[^\s]*$|^https:\/\/[^\s]+$/.test(u), "The button link must start with / or https://"),
  imageUrl: z.string().trim().max(500).refine(u => !u || /^\/[^\s]*$|^https:\/\/[^\s]+$/.test(u), "The picture must be a path like /loft.jpg or an https link"), signOff: z.string().max(300),
});
const company = async () => { const { company: c } = await companyProfile(); return { name: c.registeredName || c.name || "2A Construction Ltd", address: c.address.replace(/\n/g, ", "), phone: c.phone, email: c.email }; };
const base = () => siteUrl() || "https://2aconstruction.co.uk";

/** Preview exactly what people will get (the broadcast version, with the personalisation shown as "there"). */
export async function previewAction(raw: unknown): Promise<R<{ html: string; subject: string }>> {
  try {
    await requireCatalogueAdmin();
    const c = contentSchema.parse(raw);
    const r = renderMarketing(c, { base: base(), company: await company(), mode: "test", testFirstName: "Sarah" });
    return { ok: true, html: r.html, subject: r.subject };
  } catch (e) { return fail(e); }
}

/** Send a test copy to yourself (counts as one normal email). */
export async function testSendAction(raw: unknown): Promise<R> {
  try {
    await requireCatalogueAdmin();
    const c = contentSchema.parse(raw);
    const me = (await getAuthSession().getUser())?.email ?? "";
    const to = me || (process.env.ADMIN_EMAILS ?? "").split(/[,;\s]+/).filter(Boolean)[0] || officeInbox()[0];
    if (!to) throw new Error("No email address to send the test to.");
    const r = renderMarketing(c, { base: base(), company: await company(), mode: "test", testFirstName: (await getAuthSession().getUser())?.given_name || "there" });
    const s = await sendMail({ from: "marketing", to, subject: `[TEST] ${r.subject}`, text: r.text, html: r.html });
    if (!s.sent) throw new Error(s.reason);
    return { ok: true, message: `Test sent to ${to}.` };
  } catch (e) { return fail(e); }
}

export async function saveTemplateAction(id: string | null, name: string, raw: unknown): Promise<R<{ id: string }>> {
  try {
    const actor = await ready();
    const t = await saveTemplate(db(), { id: id ?? undefined, name: z.string().trim().min(2, "Name the template").max(100).parse(name), content: contentSchema.parse(raw) }, actor);
    revalidatePath("/dashboard/marketing");
    return { ok: true, id: t, message: "Template saved." };
  } catch (e) { return fail(e); }
}
export async function deleteTemplateAction(id: string, typed: string): Promise<R> {
  try {
    await ready();
    if (typed.trim() !== "DELETE") throw new Error("Type DELETE to confirm.");
    await deleteTemplate(db(), z.string().uuid().parse(id));
    revalidatePath("/dashboard/marketing");
    return { ok: true, message: "Template deleted." };
  } catch (e) { return fail(e); }
}

/** Someone told us (phone, email, in person) they'd like news and offers. */
export async function addConsentAction(email: string, name: string, note: string): Promise<R> {
  try {
    await ready();
    const e = z.string().trim().email("Enter a valid email").parse(email);
    await recordConsent(db(), { email: e, name: z.string().trim().max(120).parse(name), source: "OFFICE", wording: "Told the office they'd like news and offers.", note: z.string().trim().min(3, "Say how they told you (e.g. phone call 18 Nov)").max(300).parse(note) }, true);
    revalidatePath("/dashboard/marketing");
    return { ok: true, message: `${e} added.` };
  } catch (e) { return fail(e); }
}
export async function unsubscribeAction(email: string): Promise<R> {
  try {
    await ready();
    const e = z.string().trim().email().parse(email);
    await recordUnsubscribe(db(), e, "OFFICE");
    if (marketingConfigured()) await unsubscribeContact(e).catch(() => {});
    revalidatePath("/dashboard/marketing");
    return { ok: true, message: `${e} won't get marketing emails.` };
  } catch (e) { return fail(e); }
}

// ---------------------------------------------------------------- Sending (Resend broadcast to one segment)

async function segmentId() {
  const saved = await getSetting(db(), "marketingSegmentId");
  if (saved) return saved;
  const id = await createSegment("2A Construction – current send");
  await setSetting(db(), "marketingSegmentId", id);
  return id;
}

/** Step 1: check the chosen people and work out who to add to / remove from the send list in Resend. */
export async function prepareSendAction(emails: string[]): Promise<R<{ adds: { email: string; firstName: string; lastName: string }[]; removes: string[]; skipped: string[] }>> {
  try {
    await ready();
    if (!marketingConfigured()) throw new Error("Resend isn't set up (RESEND_API_KEY).");
    const chosen = new Set(z.array(z.string().email()).min(1, "Choose who to send to").max(1000, "At most 1,000 people (the Resend free plan limit)").parse(emails).map(e => e.toLowerCase()));
    const all = await marketingContacts(db());
    const ok = all.filter(c => chosen.has(c.email) && sendable(c));
    const skipped = [...chosen].filter(e => !ok.some(c => c.email === e));
    const seg = await segmentId();
    const current = await segmentContacts(seg).catch(async e => {
      // The saved segment was deleted in Resend: make a new one.
      if (e instanceof ResendError && e.status === 404) { await setSetting(db(), "marketingSegmentId", ""); const id = await segmentId(); return segmentContacts(id); }
      throw e;
    });
    // Anyone who unsubscribed through Resend's link is recorded here too, so they're never selected again.
    for (const c of current.filter(c => c.unsubscribed)) await recordUnsubscribe(db(), c.email, "RESEND");
    const inSeg = new Set(current.map(c => c.email));
    const adds = ok.filter(c => !inSeg.has(c.email)).map(c => { const [first, ...rest] = c.name.trim().split(/\s+/); return { email: c.email, firstName: first ?? "", lastName: rest.join(" ") }; });
    const removes = current.filter(c => !chosen.has(c.email) || !ok.some(o => o.email === c.email)).map(c => c.email);
    return { ok: true, adds, removes, skipped };
  } catch (e) { return fail(e); }
}

/** Step 2 (repeated): add / remove a few people at a time (Resend allows a handful of requests a second). */
export async function syncBatchAction(adds: { email: string; firstName: string; lastName: string }[], removes: string[]): Promise<R> {
  try {
    await ready();
    const a = z.array(z.object({ email: z.string().email(), firstName: z.string().max(80), lastName: z.string().max(80) })).max(20).parse(adds);
    const r = z.array(z.string().email()).max(20).parse(removes);
    const seg = await segmentId();
    for (const x of a) await addToSegment(seg, x);
    for (const x of r) await removeFromSegment(seg, x);
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** Step 3: send. Records the campaign and exactly who it went to. */
export async function sendCampaignAction(name: string, raw: unknown, emails: string[]): Promise<R<{ id: string }>> {
  let campaignId = "";
  try {
    const actor = await ready();
    const c = contentSchema.parse(raw);
    const chosen = new Set(z.array(z.string().email()).min(1).max(1000).parse(emails).map(e => e.toLowerCase()));
    const people = (await marketingContacts(db())).filter(p => chosen.has(p.email) && sendable(p));
    if (!people.length) throw new Error("Nobody left to send to (they may have unsubscribed).");
    const r = renderMarketing(c, { base: base(), company: await company(), mode: "broadcast" });
    const from = senderAddress("marketing");
    campaignId = await createCampaign(db(), { name: z.string().trim().min(2).max(120).parse(name), subject: c.subject, fromAddress: from, content: c, html: r.html, recipients: people.map(p => ({ email: p.email, name: p.name, basis: p.basis })) }, actor);
    const broadcastId = await sendBroadcast({ segmentId: await segmentId(), from, replyTo: officeInbox()[0], subject: r.subject, html: r.html, text: r.text, name: `${name} (${new Date().toISOString().slice(0, 10)})` });
    await finishCampaign(db(), campaignId, { broadcastId });
    revalidatePath("/dashboard/marketing");
    return { ok: true, id: campaignId, message: `Sending to ${people.length} ${people.length === 1 ? "person" : "people"} now. Resend delivers it over the next few minutes.` };
  } catch (e) {
    if (campaignId) await finishCampaign(db(), campaignId, { error: e instanceof Error ? e.message : "Failed" }).catch(() => {});
    return fail(e);
  }
}
