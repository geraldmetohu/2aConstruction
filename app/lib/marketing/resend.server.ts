import "server-only";

// Resend's marketing side (contacts, one segment, broadcasts). Broadcasts don't count against the free plan's
// 100-a-day / 3,000-a-month transactional limit – the free plan allows 1,000 marketing contacts.
// Needs an API key with Full access (a "Sending access" key can only send single emails): set
// RESEND_MARKETING_API_KEY, or give RESEND_API_KEY full access.
const key = () => (process.env.RESEND_MARKETING_API_KEY || process.env.RESEND_API_KEY || "").trim();
export const marketingConfigured = () => key().startsWith("re_");

export class ResendError extends Error { constructor(message: string, public status: number) { super(message); } }

let lastCall = 0;
/** One request at a time, at most ~4 a second (Resend allows 10/s for the whole team, shared with other emails). */
async function call<T>(method: string, path: string, body?: unknown, retry = 2): Promise<T> {
  const wait = lastCall + 260 - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const r = await fetch(`https://api.resend.com${path}`, { method, headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20_000) });
  if (r.status === 429 && retry > 0) { await new Promise(res => setTimeout(res, 1100 * (3 - retry))); return call(method, path, body, retry - 1); }
  const text = await r.text();
  if (!r.ok) {
    let msg = text.slice(0, 300); try { msg = (JSON.parse(text) as { message?: string }).message ?? msg; } catch { /* plain text */ }
    if (r.status === 401 || r.status === 403) msg = `Resend refused the request (${msg}). Marketing needs a Resend API key with Full access – set RESEND_MARKETING_API_KEY in Vercel.`;
    throw new ResendError(msg, r.status);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export async function createSegment(name: string) { return (await call<{ id: string }>("POST", "/segments", { name })).id; }

/** Everyone currently in the segment (and whether they've unsubscribed). */
export async function segmentContacts(segmentId: string) {
  const out: { id: string; email: string; unsubscribed: boolean }[] = [];
  let after = "";
  for (let page = 0; page < 50; page++) {
    const r = await call<{ data: { id: string; email: string; unsubscribed: boolean }[]; has_more: boolean }>("GET", `/segments/${segmentId}/contacts?limit=100${after ? `&after=${after}` : ""}`);
    out.push(...r.data.map(c => ({ id: c.id, email: c.email.toLowerCase(), unsubscribed: !!c.unsubscribed })));
    if (!r.has_more || !r.data.length) break;
    after = r.data[r.data.length - 1].id;
  }
  return out;
}

/** Put a person in the segment (creating the contact the first time). Their unsubscribe status is never changed here. */
export async function addToSegment(segmentId: string, c: { email: string; firstName: string; lastName: string }) {
  try {
    await call("POST", "/contacts", { email: c.email, first_name: c.firstName || undefined, last_name: c.lastName || undefined, segments: [{ id: segmentId }] });
  } catch (e) {
    if (!(e instanceof ResendError) || ![400, 409, 422].includes(e.status)) throw e;
    // Already a contact: just add them to the segment.
    await call("POST", `/contacts/${encodeURIComponent(c.email)}/segments/${segmentId}`);
  }
}
export async function removeFromSegment(segmentId: string, email: string) {
  try { await call("DELETE", `/contacts/${encodeURIComponent(email)}/segments/${segmentId}`); }
  catch (e) { if (!(e instanceof ResendError) || e.status !== 404) throw e; }
}
export async function unsubscribeContact(email: string) {
  try { await call("PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true }); }
  catch (e) { if (!(e instanceof ResendError) || e.status !== 404) throw e; }
}

/** Create and send the broadcast straight away to everyone subscribed in the segment. */
export async function sendBroadcast(b: { segmentId: string; from: string; replyTo?: string; subject: string; html: string; text: string; name: string }) {
  const r = await call<{ id: string }>("POST", "/broadcasts", { segment_id: b.segmentId, from: b.from, ...(b.replyTo ? { reply_to: b.replyTo } : {}), subject: b.subject, html: b.html, text: b.text, name: b.name, send: true });
  return r.id;
}
