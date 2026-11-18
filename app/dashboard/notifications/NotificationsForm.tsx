"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Copy, RefreshCw } from "lucide-react";
import type { NotificationSettings } from "@/app/lib/settings/app-settings";
import { calendarLinkAction, saveNotificationsAction } from "./actions";

const ITEMS: [keyof NotificationSettings, string, string][] = [
  ["portalDigest", "Client portal changes – one email an hour", "Messages, answers, payments reported, snags and supplies from clients, collected into one email an hour (nothing if nothing changed)."],
  ["morningList", "Morning list for the office (06:30)", "Orders to place, payments due or overdue, client answers, team owed – every morning."],
  ["clientReminders", "Reminders to clients (06:30)", "Tells clients about items they must order and payments due in the next few days."],
  ["reviewRequests", "Review request a week after handover", "Asks the client once for a review, with a link to their project page and Checkatrade."],
];

export function NotificationsForm({ initial, ready, calendarUrl }: { initial: NotificationSettings; ready: boolean; calendarUrl: string | null }) {
  const router = useRouter();
  const [n, setN] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = (Object.keys(n) as (keyof NotificationSettings)[]).some(k => n[k] !== initial[k]);
  const run = async (fn: () => Promise<{ ok: boolean; message: string }>) => { setBusy(true); const r = await fn(); setBusy(false); setMsg({ ok: r.ok, text: r.message }); if (r.ok) router.refresh(); };
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Automatic emails</h2>
        <ul className="mt-3 space-y-3">{ITEMS.map(([k, title, hint]) => (
          <li key={k}><label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-3">
            <span><span className="block font-semibold">{title}</span><span className="block text-xs text-neutral-600">{hint}</span></span>
            <span className="relative mt-1 inline-flex shrink-0">
              <input type="checkbox" className="peer sr-only" checked={n[k]} disabled={!ready} onChange={e => setN({ ...n, [k]: e.target.checked })} />
              <span className="h-6 w-11 rounded-full bg-neutral-300 transition peer-checked:bg-emerald-500 peer-disabled:opacity-40" />
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label></li>))}</ul>
        <button disabled={busy || !changed || !ready} onClick={() => run(() => saveNotificationsAction(n))} className="mt-4 rounded-full bg-neutral-950 px-5 py-2 text-sm font-bold text-white disabled:opacity-40">Save</button>
        {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      </section>
      <section className="h-fit rounded-2xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 text-amber-600" />Team calendar</h2>
        <p className="mt-1 text-sm text-neutral-600">Every stage on live jobs, payments due and questions clients must answer by a date – in your phone&apos;s calendar. It updates by itself every couple of hours.</p>
        {calendarUrl ? <>
          <div className="mt-3 flex gap-2"><input readOnly value={calendarUrl} className="h-10 min-w-0 flex-1 rounded-lg border bg-neutral-50 px-3 font-mono text-xs" onFocus={e => e.currentTarget.select()} />
            <button onClick={() => { navigator.clipboard?.writeText(calendarUrl); setMsg({ ok: true, text: "Calendar link copied." }); }} className="inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-bold"><Copy className="h-3.5 w-3.5" />Copy</button></div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-neutral-600">
            <li><strong>Google Calendar</strong> (on a computer): Other calendars → + → From URL → paste the link.</li>
            <li><strong>Outlook</strong>: Add calendar → Subscribe from web → paste the link.</li>
            <li><strong>iPhone</strong>: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar.</li>
            <li>Keep the link to the team – anyone with it can see job dates and addresses.</li>
          </ul>
          <button disabled={busy} onClick={() => confirm("Make a new link? Everyone subscribed with the old one will need the new link.") && run(() => calendarLinkAction(true))} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 underline"><RefreshCw className="h-3.5 w-3.5" />Make a new link (stops the old one)</button>
        </> : <button disabled={busy || !ready} onClick={() => run(() => calendarLinkAction(false))} className="mt-3 rounded-full bg-neutral-950 px-5 py-2 text-sm font-bold text-white disabled:opacity-40">Create the calendar link</button>}
      </section>
    </div>
  );
}
