"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, TriangleAlert, X } from "lucide-react";

/**
 * A delete button that opens a dialog: it says exactly what will be removed and only works once the
 * confirmation word (e.g. the quote reference) is typed in. Nothing is deleted until then.
 */
export function ConfirmDelete({ word, title, what, run, label = "Delete", small, after, children }: {
  /** The word the person must type, shown in the dialog. */
  word: string;
  title: string;
  /** What will be removed – listed in the dialog. */
  what: string[];
  run: (typed: string) => Promise<{ ok: boolean; message: string }>;
  label?: string; small?: boolean;
  /** Where to go after deleting (default: refresh this page). */
  after?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setTyped(""); setMsg(null); setTimeout(() => input.current?.focus(), 50); } }, [open]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && setOpen(false); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open, busy]);
  const match = typed.trim() === word.trim();
  async function go() {
    if (!match || busy) return;
    setBusy(true);
    const r = await run(typed);
    setBusy(false);
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) setTimeout(() => { setOpen(false); if (after) router.push(after); router.refresh(); }, 1400);
  }
  return (
    <>
      <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={small ? "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" : "inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"}
        aria-label={`${label}: ${title}`}>{children ?? <><Trash2 className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />{label}</>}</button>
      {open && (
        <div role="dialog" aria-modal aria-labelledby="cd-title" className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-700"><TriangleAlert className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 id="cd-title" className="text-lg font-black text-neutral-900">{title}</h2>
                <p className="mt-0.5 text-sm text-neutral-600">This can&apos;t be undone. It permanently removes:</p>
              </div>
              <button onClick={() => !busy && setOpen(false)} aria-label="Close" className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
            </div>
            <ul className="mt-3 space-y-1 rounded-2xl bg-red-50 p-3 text-sm text-red-900">{what.map(w => <li key={w} className="flex gap-2"><span aria-hidden>•</span>{w}</li>)}</ul>
            <label className="mt-4 block text-sm font-semibold text-neutral-800">Type <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-red-700">{word}</span> to confirm
              <input ref={input} value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} autoComplete="off" spellCheck={false}
                className={`mt-1.5 h-11 w-full rounded-xl border-2 px-3 font-mono text-base outline-none ${match ? "border-red-500" : "border-neutral-200 focus:border-neutral-400"}`} />
            </label>
            {msg && <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setOpen(false)} disabled={busy} className="h-11 flex-1 rounded-full border font-semibold text-neutral-700">Cancel</button>
              <button onClick={go} disabled={!match || busy || !!msg?.ok} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-red-600 font-bold text-white disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete for good</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
