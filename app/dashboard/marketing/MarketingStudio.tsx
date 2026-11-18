"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Mail, Megaphone, Save, Send, Users } from "lucide-react";
import type { EmailContent, StarterTemplate } from "@/app/lib/marketing/templates";
import type { MarketingContact } from "@/app/lib/marketing/contacts";
import { ConfirmDelete } from "@/app/componets/dashboard/ConfirmDelete";
import { addConsentAction, deleteTemplateAction, prepareSendAction, previewAction, saveTemplateAction, sendCampaignAction, syncBatchAction, testSendAction, unsubscribeAction } from "./actions";

type Saved = { id: string; name: string; content: EmailContent };
type Campaign = { id: string; name: string; subject: string; recipients: number; status: string; error: string; createdBy: string; createdAt: string; sentAt: string | null; fromAddress: string };
const BASIS: Record<MarketingContact["basis"], [string, string]> = {
  CONSENT: ["Said yes to marketing", "bg-emerald-100 text-emerald-800"],
  SOFT_OPT_IN: ["Asked us for a quote", "bg-sky-100 text-sky-800"],
  NONE: ["Not agreed to marketing", "bg-neutral-100 text-neutral-500"],
};
const input = "mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm";
const btn = "inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold disabled:opacity-40";
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

export function MarketingStudio({ starters, saved, contacts, campaigns, recent, from, setup }: {
  starters: StarterTemplate[]; saved: Saved[]; contacts: MarketingContact[]; campaigns: Campaign[]; recent: Record<string, string>; from: string;
  setup: { tables: boolean; resend: boolean };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"write" | "contacts" | "sent">("write");
  const [c, setC] = useState<EmailContent>(starters[0].content);
  const [templateId, setTemplateId] = useState<string>(`starter:${starters[0].id}`);
  const [name, setName] = useState(starters[0].name);
  const [preview, setPreview] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [asking, setAsking] = useState(false);
  const [newC, setNewC] = useState({ email: "", name: "", note: "" });

  const choose = (id: string) => {
    setTemplateId(id); setPreview(null);
    if (id.startsWith("starter:")) { const t = starters.find(x => `starter:${x.id}` === id)!; setC(t.content); setName(t.name); }
    else { const t = saved.find(x => x.id === id)!; setC(t.content); setName(t.name); }
  };
  const set = (patch: Partial<EmailContent>) => { setC({ ...c, ...patch }); setPreview(null); };
  const run = async <T extends { ok: boolean; message?: string }>(fn: () => Promise<T>, done?: string) => {
    setBusy(true); setMsg(null); const r = await fn(); setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? (r.message ?? done ?? "Done.") : r.message ?? "Failed." }); if (r.ok) router.refresh(); return r;
  };
  const sendableList = contacts.filter(x => !x.unsubscribed && x.basis !== "NONE");
  const shown = useMemo(() => contacts.filter(x => !q.trim() || `${x.email} ${x.name} ${x.detail}`.toLowerCase().includes(q.trim().toLowerCase())), [contacts, q]);
  const toggle = (e: string) => { const n = new Set(picked); if (n.has(e)) n.delete(e); else n.add(e); setPicked(n); };
  const pick = (f: (x: MarketingContact) => boolean) => setPicked(new Set(sendableList.filter(f).map(x => x.email)));

  const send = async () => {
    setAsking(false); setBusy(true); setMsg(null);
    try {
      setProgress("Checking the list…");
      const p = await prepareSendAction([...picked]);
      if (!p.ok) throw new Error(p.message);
      let a = p.adds, r = p.removes; const total = a.length + r.length; let done = 0;
      while (a.length || r.length) {
        const ba = a.slice(0, 10), br = r.slice(0, 10); a = a.slice(10); r = r.slice(10);
        setProgress(`Preparing the send list in Resend… ${done} of ${total}`);
        const s = await syncBatchAction(ba, br); if (!s.ok) throw new Error(s.message);
        done += ba.length + br.length;
      }
      setProgress("Sending…");
      const s = await sendCampaignAction(name, c, [...picked]);
      if (!s.ok) throw new Error(s.message);
      setMsg({ ok: true, text: `${s.message}${p.skipped.length ? ` (${p.skipped.length} skipped – unsubscribed or not allowed.)` : ""}` });
      setPicked(new Set()); setConfirm(""); router.refresh();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Sending failed." }); }
    setBusy(false); setProgress("");
  };

  return (
    <div className="space-y-4">
      {(!setup.tables || !setup.resend) && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        {!setup.tables && <p>Needs the database update 20261118130000_admin_tools (run <code>npx prisma migrate deploy</code>).</p>}
        {!setup.resend && <p>Resend isn&apos;t set up for sending – add RESEND_API_KEY (or RESEND_MARKETING_API_KEY) in Vercel.</p>}
      </div>}
      <nav className="flex gap-2">{([["write", "Write & send", Megaphone], ["contacts", `Contacts (${sendableList.length} can be emailed)`, Users], ["sent", `Sent (${campaigns.length})`, Mail]] as const).map(([k, l, I]) =>
        <button key={k} onClick={() => setTab(k)} className={`${btn} ${tab === k ? "bg-neutral-950 text-white" : "border bg-white"}`}><I className="h-3.5 w-3.5" />{l}</button>)}</nav>
      {msg && <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {tab === "write" && <div className="grid gap-5 2xl:grid-cols-[1.1fr_1fr]">
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <label className="block text-xs font-semibold">Start from<select className={input} value={templateId} onChange={e => choose(e.target.value)}>
            <optgroup label="Ready-made">{starters.map(t => <option key={t.id} value={`starter:${t.id}`}>{t.category} – {t.name}</option>)}</optgroup>
            {saved.length > 0 && <optgroup label="Your templates">{saved.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
          </select></label>
          <p className="text-xs text-neutral-500">Sent from <strong>{from}</strong>. Write <code className="rounded bg-neutral-100 px-1">{"{{first_name}}"}</code> for the person&apos;s first name. Replace anything in [square brackets] before sending.</p>
          <label className="block text-xs font-semibold">Subject<input className={input} value={c.subject} onChange={e => set({ subject: e.target.value })} maxLength={150} /></label>
          <label className="block text-xs font-semibold">Preview line (shown after the subject in the inbox)<input className={input} value={c.preheader} onChange={e => set({ preheader: e.target.value })} maxLength={200} /></label>
          <label className="block text-xs font-semibold">Heading<input className={input} value={c.heading} onChange={e => set({ heading: e.target.value })} maxLength={150} /></label>
          <label className="block text-xs font-semibold">Message (leave a blank line between paragraphs)<textarea rows={9} className={input} value={c.paragraphs.join("\n\n")} onChange={e => set({ paragraphs: e.target.value.split(/\n\s*\n/) })} /></label>
          <label className="block text-xs font-semibold">Ticked points (one per line, optional)<textarea rows={3} className={input} value={c.bullets.join("\n")} onChange={e => set({ bullets: e.target.value.split("\n") })} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold">Button text<input className={input} value={c.buttonLabel} onChange={e => set({ buttonLabel: e.target.value })} maxLength={60} /></label>
            <label className="block text-xs font-semibold">Button link (/contact, /estimator or https://…)<input className={input} value={c.buttonUrl} onChange={e => set({ buttonUrl: e.target.value })} /></label>
            <label className="block text-xs font-semibold">Picture<select className={input} value={["", "/loft.jpg", "/extention.jpeg", "/roof.jpg", "/refurbishment.jpg", "/general.jpg"].includes(c.imageUrl) ? c.imageUrl : "custom"} onChange={e => e.target.value !== "custom" && set({ imageUrl: e.target.value })}>
              <option value="">No picture</option><option value="/extention.jpeg">Extension</option><option value="/loft.jpg">Loft</option><option value="/roof.jpg">Roof</option><option value="/refurbishment.jpg">Refurbishment</option><option value="/general.jpg">General building</option><option value="custom">Other (link below)</option></select></label>
            <label className="block text-xs font-semibold">…or a picture link<input className={input} value={c.imageUrl} onChange={e => set({ imageUrl: e.target.value })} placeholder="https://…" /></label>
          </div>
          <label className="block text-xs font-semibold">Sign-off<textarea rows={2} className={input} value={c.signOff} onChange={e => set({ signOff: e.target.value })} /></label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button disabled={busy} onClick={async () => { const r = await run(() => previewAction(c)); if (r.ok && "html" in r) setPreview((r as { html: string }).html); }} className={`${btn} border`}><Eye className="h-3.5 w-3.5" />Preview</button>
            <button disabled={busy} onClick={() => run(() => testSendAction(c))} className={`${btn} border`}><Mail className="h-3.5 w-3.5" />Send me a test</button>
            <input className="h-8 rounded-full border px-3 text-xs" value={name} onChange={e => setName(e.target.value)} placeholder="Template name" />
            <button disabled={busy || !setup.tables} onClick={() => run(() => saveTemplateAction(templateId.startsWith("starter:") ? null : templateId, name, c))} className={`${btn} border`}><Save className="h-3.5 w-3.5" />{templateId.startsWith("starter:") ? "Save as my template" : "Save template"}</button>
            {!templateId.startsWith("starter:") && <ConfirmDelete small word="DELETE" title="Delete this template?" what={[name]} run={async t => { const r = await deleteTemplateAction(templateId, t); return { ok: r.ok, message: r.message ?? "" }; }} label="Delete template" />}
          </div>
          {preview && <iframe title="Email preview" srcDoc={preview} sandbox="" className="mt-3 h-[640px] w-full rounded-xl border" />}
        </section>

        <section className="h-fit space-y-3 rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Who gets it <span className="text-sm font-normal text-neutral-500">({picked.size} chosen)</span></h2>
            <span className="flex flex-wrap gap-1.5">
              <button onClick={() => pick(x => x.basis === "CONSENT")} className={`${btn} border`}>Everyone who said yes</button>
              <button onClick={() => pick(x => x.basis === "SOFT_OPT_IN")} className={`${btn} border`}>Past quotes</button>
              <button onClick={() => setPicked(new Set())} className={`${btn} border`}>Clear</button>
            </span></div>
          <input className={input} placeholder="Search name, email, quote…" value={q} onChange={e => setQ(e.target.value)} />
          <ul className="max-h-[520px] divide-y overflow-y-auto rounded-xl border">{shown.map(x => {
            const can = !x.unsubscribed && x.basis !== "NONE", lately = recent[x.email];
            return (
              <li key={x.email}><label className={`flex items-start gap-3 px-3 py-2 text-sm ${can ? "cursor-pointer hover:bg-neutral-50" : "opacity-60"}`}>
                <input type="checkbox" className="mt-1" disabled={!can} checked={picked.has(x.email)} onChange={() => toggle(x.email)} />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{x.name || x.email}</span><span className="block truncate text-xs text-neutral-500">{x.email} · {x.detail}{x.lastAt ? ` · ${dt(x.lastAt)}` : ""}</span>
                  {lately && <span className="block text-xs font-semibold text-amber-700">Emailed {dt(lately)} – maybe give them a break</span>}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${x.unsubscribed ? "bg-red-100 text-red-700" : BASIS[x.basis][1]}`}>{x.unsubscribed ? "Unsubscribed" : BASIS[x.basis][0]}</span>
              </label></li>);
          })}</ul>
          <p className="text-xs text-neutral-500">Only people who said yes to marketing, or who asked us for a quote (the “soft opt-in”), can be chosen. Agreeing to our terms on the estimator isn&apos;t consent to marketing. Every email has a one-click unsubscribe.</p>
          {!asking ? <button disabled={busy || !picked.size || !setup.tables || !setup.resend} onClick={() => setAsking(true)} className={`${btn} w-full bg-amber-500 py-3 text-sm text-neutral-950`}><Send className="h-4 w-4" />Send to {picked.size} {picked.size === 1 ? "person" : "people"}</button>
            : <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-sm">
              <p><strong>Send “{c.subject}”</strong> to {picked.size} {picked.size === 1 ? "person" : "people"} from {from}? This can&apos;t be undone. Type <strong>SEND</strong> to confirm.</p>
              <div className="mt-2 flex gap-2"><input autoFocus className="h-9 flex-1 rounded-lg border px-2" value={confirm} onChange={e => setConfirm(e.target.value)} />
                <button disabled={busy || confirm.trim() !== "SEND"} onClick={send} className={`${btn} bg-neutral-950 text-white`}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Send</button>
                <button disabled={busy} onClick={() => { setAsking(false); setConfirm(""); }} className={`${btn} border`}>Cancel</button></div>
              {progress && <p className="mt-2 text-xs text-neutral-600">{progress}</p>}
            </div>}
        </section>
      </div>}

      {tab === "contacts" && <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-bold">Someone asked to hear from you</h2>
          <p className="mt-1 text-xs text-neutral-600">For people who told you by phone, email or in person. Keep a note of how and when – it&apos;s your record of their consent.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold">Email<input className={input} value={newC.email} onChange={e => setNewC({ ...newC, email: e.target.value })} /></label>
            <label className="text-xs font-semibold">Name<input className={input} value={newC.name} onChange={e => setNewC({ ...newC, name: e.target.value })} /></label>
            <label className="text-xs font-semibold sm:col-span-2">How they told you<input className={input} value={newC.note} onChange={e => setNewC({ ...newC, note: e.target.value })} placeholder="e.g. Asked on the phone, 18 Nov 2026" /></label>
          </div>
          <button disabled={busy} onClick={async () => { const r = await run(() => addConsentAction(newC.email, newC.name, newC.note)); if (r.ok) setNewC({ email: "", name: "", note: "" }); }} className={`${btn} mt-3 bg-neutral-950 text-white`}>Add</button>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-bold">Everyone ({contacts.length})</h2>
          <p className="mt-1 text-xs text-neutral-600">{contacts.filter(x => x.basis === "CONSENT" && !x.unsubscribed).length} said yes · {contacts.filter(x => x.basis === "SOFT_OPT_IN" && !x.unsubscribed).length} asked for a quote · {contacts.filter(x => x.unsubscribed).length} unsubscribed · {contacts.filter(x => x.basis === "NONE" && !x.unsubscribed).length} not agreed</p>
          <ul className="mt-3 max-h-[520px] divide-y overflow-y-auto rounded-xl border">{contacts.map(x => (
            <li key={x.email} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0"><span className="block truncate font-semibold">{x.name || x.email}</span><span className="block truncate text-xs text-neutral-500">{x.email} · {x.sources.join(", ")}</span></span>
              <span className="flex shrink-0 items-center gap-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${x.unsubscribed ? "bg-red-100 text-red-700" : BASIS[x.basis][1]}`}>{x.unsubscribed ? "Unsubscribed" : BASIS[x.basis][0]}</span>
                {!x.unsubscribed && x.basis !== "NONE" && <button disabled={busy} onClick={() => confirmUnsub(x.email) && run(() => unsubscribeAction(x.email))} className="text-xs font-semibold text-red-700 underline">Unsubscribe</button>}</span>
            </li>))}</ul>
        </section>
      </div>}

      {tab === "sent" && <section className="rounded-2xl border bg-white p-5">
        {!campaigns.length ? <p className="text-sm text-neutral-600">Nothing sent yet.</p> : <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-500"><th className="py-2">Sent</th><th>Email</th><th>To</th><th>From</th><th>Status</th></tr></thead>
          <tbody>{campaigns.map(x => <tr key={x.id} className="border-b align-top"><td className="py-2 pr-3 whitespace-nowrap">{dt(x.sentAt ?? x.createdAt)}<span className="block text-xs text-neutral-500">{x.createdBy}</span></td><td className="pr-3"><span className="font-semibold">{x.subject}</span><span className="block text-xs text-neutral-500">{x.name}</span></td><td className="pr-3">{x.recipients}</td><td className="pr-3 text-xs">{x.fromAddress}</td><td><span className={`rounded px-1.5 py-0.5 text-xs font-bold ${x.status === "SENT" ? "bg-emerald-100 text-emerald-800" : x.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900"}`}>{x.status.toLowerCase()}</span>{x.error && <span className="block text-xs text-red-700">{x.error}</span>}</td></tr>)}</tbody></table>}
        <p className="mt-3 text-xs text-neutral-500">Opens, clicks and bounces for each send are in your Resend dashboard → Broadcasts.</p>
      </section>}
    </div>
  );
}
const confirmUnsub = (e: string) => window.confirm(`Stop all marketing emails to ${e}?`);
