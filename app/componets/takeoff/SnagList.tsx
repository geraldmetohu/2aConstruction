"use client";
import { useState } from "react";
import { Camera, CircleCheck, Plus, RotateCcw } from "lucide-react";
import { UploadButton } from "@/app/lib/uploadthing";

export interface SnagView { id: string; title: string; detail: string; location: string; photoUrl: string; status: "OPEN" | "DONE"; raisedByKind: string; doneByKind: string | null; doneAt: string | null; createdAt: string }
type Draft = { title: string; detail: string; location: string; photoUrl: string };
const blank: Draft = { title: "", detail: "", location: "", photoUrl: "" };
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/**
 * The snagging list, shared by the client portal and the job page. Either side can add a snag (with a photo),
 * mark it done or reopen it; each item says who raised it and who closed it.
 */
export function SnagList({ snags, audience, busy, add, toggle }: {
  snags: SnagView[]; audience: "client" | "admin"; busy: boolean;
  add: (d: Draft) => Promise<boolean>; toggle: (id: string, done: boolean) => Promise<boolean>;
}) {
  const [d, setD] = useState<Draft>(blank);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const open = snags.filter(s => s.status === "OPEN"), done = snags.filter(s => s.status === "DONE");
  const them = audience === "client" ? "us" : "the client";
  const by = (k: string | null) => (k === "CLIENT" ? (audience === "client" ? "you" : "client") : audience === "client" ? "us" : "you");
  const field = "w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {([["Open", open.length, "text-amber-700"], ["Done", done.length, "text-emerald-700"], ["Total", snags.length, "text-neutral-900"]] as const).map(([l, n, c]) => (
          <div key={l} className="rounded-2xl border bg-white p-4"><p className="text-xs text-neutral-500">{l}</p><p className={`text-2xl font-black ${c}`}>{n}</p></div>
        ))}
      </div>

      <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#071a33]">Add a snag</h2>
        <p className="mt-1 text-sm text-neutral-600">Anything not finished, damaged or not right – one item each, ideally with a photo. {audience === "client" ? "We'll fix it and mark it done; you can reopen it if you're not happy." : "The client sees it in their portal."}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr]">
          <input className={field} placeholder="What needs doing? e.g. Paint missed above the door" maxLength={200} value={d.title} onChange={e => setD({ ...d, title: e.target.value })} />
          <input className={field} placeholder="Where? e.g. Loft bedroom" maxLength={120} value={d.location} onChange={e => setD({ ...d, location: e.target.value })} />
        </div>
        <textarea className={`${field} mt-2`} rows={2} placeholder="More detail (optional)" maxLength={2000} value={d.detail} onChange={e => setD({ ...d, detail: e.target.value })} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {d.photoUrl ? <span className="flex items-center gap-2 text-sm"><img src={d.photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /><button onClick={() => setD({ ...d, photoUrl: "" })} className="text-xs text-neutral-500 underline">Remove photo</button></span>
            : <UploadButton endpoint="snagPhotoRoute" config={{ mode: "auto" }} content={{ button: () => <span className="flex items-center gap-1.5"><Camera className="h-4 w-4" />{uploading ? "Uploading…" : "Add a photo"}</span> }}
                onUploadBegin={() => setUploading(true)}
                onClientUploadComplete={(res: unknown[]) => { setUploading(false); const f = (res as { ufsUrl?: string; url?: string }[])[0]; setD(x => ({ ...x, photoUrl: f?.ufsUrl || f?.url || "" })); }}
                onUploadError={(e: unknown) => { setUploading(false); setErr((e instanceof Error && e.message) || "Photo upload failed."); }}
                appearance={{ button: "rounded-full border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 ut-uploading:opacity-60", allowedContent: "hidden" }} />}
          <button disabled={busy || uploading || d.title.trim().length < 3} onClick={async () => { setErr(""); if (await add(d)) setD(blank); }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#071a33] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add snag</button>
        </div>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </section>

      {([["To fix", open], ["Done", done]] as const).map(([title, list]) => list.length > 0 && (
        <section key={title} className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#071a33]">{title}</h2>
          <ul className="mt-2 divide-y">{list.map(s => (
            <li key={s.id} className="flex gap-3 py-3">
              {s.photoUrl ? <a href={s.photoUrl} target="_blank" rel="noreferrer" className="shrink-0"><img src={s.photoUrl} alt="" className="h-16 w-16 rounded-lg object-cover" loading="lazy" /></a> : null}
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${s.status === "DONE" ? "text-neutral-500 line-through" : ""}`}>{s.title}{s.location && <span className="ml-2 text-xs font-normal text-neutral-500">{s.location}</span>}</p>
                {s.detail && <p className="text-sm text-neutral-700">{s.detail}</p>}
                <p className="mt-0.5 text-xs text-neutral-500">Added by {by(s.raisedByKind)} · {when(s.createdAt)}{s.status === "DONE" && s.doneAt ? ` · done (marked by ${by(s.doneByKind)}) ${when(s.doneAt)}` : ""}</p>
              </div>
              {s.status === "OPEN"
                ? <button disabled={busy} onClick={() => toggle(s.id, true)} className="inline-flex h-fit shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"><CircleCheck className="h-3.5 w-3.5" />Done</button>
                : <button disabled={busy} onClick={() => toggle(s.id, false)} title={`Reopen – ${them} will see it again`} className="inline-flex h-fit shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />Reopen</button>}
            </li>
          ))}</ul>
        </section>
      ))}
      {!snags.length && <p className="text-sm text-neutral-500">No snags yet. Near the end of the job we walk round together and list anything left to finish here.</p>}
    </div>
  );
}
