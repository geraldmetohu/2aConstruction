"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { setReviewAction } from "./actions";

type R = { id: string; quoteId: string; rating: number; title: string; body: string; displayName: string; area: string; allowPublish: boolean; status: string; reply: string; updatedAt: string; reference: string; clientName: string; projectTitle: string };

export function ReviewsManager({ reviews }: { reviews: R[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const go = async (id: string, status: "APPROVED" | "HIDDEN" | "PENDING", withReply?: string) => { setBusy(true); const r = await setReviewAction(id, status, withReply); setBusy(false); setMsg({ ok: r.ok, text: r.message }); if (r.ok) router.refresh(); };
  if (!reviews.length) return <p className="rounded-xl border bg-white p-6 text-sm text-neutral-600">No reviews yet. Clients can write one in their project page once a job is marked completed – and a week after handover they're asked by email (switch that on or off on the Notifications page).</p>;
  return (
    <div className="space-y-3">
      {msg && <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      {reviews.map(r => (
        <article key={r.id} className={`rounded-xl border bg-white p-4 ${r.status === "PENDING" ? "border-amber-300" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-0.5" aria-label={`${r.rating} stars`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-[#f5b400] text-[#f5b400]" : "text-neutral-300"}`} />)}</p>
              {r.title && <p className="mt-1 font-bold">{r.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-800">{r.body}</p>
              <p className="mt-2 text-xs text-neutral-500">{r.displayName}{r.area ? `, ${r.area}` : ""} · {r.clientName} · <a href={`/dashboard/jobs/${r.quoteId}`} className="underline">{r.reference}</a>{r.projectTitle ? ` · ${r.projectTitle}` : ""} · {new Date(r.updatedAt).toLocaleDateString("en-GB")}</p>
              {!r.allowPublish && <p className="mt-1 text-xs font-semibold text-neutral-600">The client asked us not to show this on the website.</p>}
            </div>
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${r.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : r.status === "HIDDEN" ? "bg-neutral-100 text-neutral-600" : "bg-amber-100 text-amber-900"}`}>{r.status === "APPROVED" ? "On the website" : r.status === "HIDDEN" ? "Hidden" : "Waiting for you"}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-[16rem] flex-1 text-xs font-semibold">Public reply (optional – shown to the client)<input className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm" value={reply[r.id] ?? r.reply} onChange={e => setReply({ ...reply, [r.id]: e.target.value })} placeholder="Thank you, it was a pleasure working with you!" /></label>
            {r.status !== "APPROVED" && r.allowPublish && <button disabled={busy} onClick={() => go(r.id, "APPROVED", reply[r.id])} className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">Approve – show on website</button>}
            {r.status === "APPROVED" && reply[r.id] !== undefined && reply[r.id] !== r.reply && <button disabled={busy} onClick={() => go(r.id, "APPROVED", reply[r.id])} className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">Save reply</button>}
            {r.status !== "HIDDEN" && <button disabled={busy} onClick={() => go(r.id, "HIDDEN", reply[r.id])} className="rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-40">{r.status === "APPROVED" ? "Take off website" : "Hide"}</button>}
          </div>
        </article>
      ))}
    </div>
  );
}
