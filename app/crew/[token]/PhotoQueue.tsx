"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CloudOff, Loader2 } from "lucide-react";

// Photos are shrunk on the phone, kept in the phone's storage (IndexedDB) and sent one by one. With no or weak
// signal they wait and go automatically when the signal is back – nothing is lost if the page is closed.
type Item = { id: string; token: string; quoteId: string; caption: string; blob: Blob; at: number; tries: number };
const DB = "2a-crew", STORE = "photos";
const open = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await open();
  return new Promise<T>((res, rej) => { const t = d.transaction(STORE, mode); const r = fn(t.objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
const all = () => tx<Item[]>("readonly", s => s.getAll() as IDBRequest<Item[]>);
const put = (i: Item) => tx("readwrite", s => s.put(i));
const del = (id: string) => tx("readwrite", s => s.delete(id));

/** Shrink to at most 1600 px on the long side, JPEG ~80% – a phone photo becomes ~300–600 KB. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("shrink"))), "image/jpeg", 0.8));
  } catch { return file; }
}

export function PhotoQueue({ token, sites }: { token: string; sites: { quoteId: string; name: string }[] }) {
  const [waiting, setWaiting] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const [caption, setCaption] = useState("");
  const [site, setSite] = useState(sites[0]?.quoteId ?? "");
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const running = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => { try { setWaiting((await all()).filter(i => i.token === token).length); } catch { /* storage blocked */ } }, [token]);
  const flush = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    running.current = true; setSending(true); setError("");
    try {
      for (const i of (await all()).filter(x => x.token === token).sort((a, b) => a.at - b.at)) {
        const f = new FormData(); f.set("token", i.token); f.set("quoteId", i.quoteId); f.set("caption", i.caption); f.set("file", i.blob, "photo.jpg");
        const r = await fetch("/api/crew/photo", { method: "POST", body: f }).catch(() => null);
        if (r?.ok) { await del(i.id); setSent(n => n + 1); }
        else if (r && (r.status === 400 || r.status === 403)) { await del(i.id); setError((await r.json().catch(() => ({ message: "A photo was refused." }))).message ?? "A photo was refused."); }
        else { await put({ ...i, tries: i.tries + 1 }); break; } // no signal / server busy – try again later
        await refresh();
      }
    } finally { running.current = false; setSending(false); refresh(); }
  }, [token, refresh]);

  useEffect(() => {
    refresh(); flush();
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); flush(); }, off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    const t = setInterval(flush, 30_000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(t); };
  }, [flush, refresh]);

  const add = async (files: FileList | null) => {
    if (!files?.length || !site) return;
    for (const file of Array.from(files)) {
      const blob = await shrink(file);
      await put({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, token, quoteId: site, caption, blob, at: Date.now(), tries: 0 }).catch(() => setError("This phone won't let the page store photos – try again with signal."));
    }
    setCaption(""); if (fileRef.current) fileRef.current.value = "";
    await refresh(); flush();
  };

  if (!sites.length) return null;
  return (
    <section className="mt-5 rounded-2xl bg-white/10 p-4">
      <p className="flex items-center gap-2 font-bold"><Camera className="h-4 w-4 text-amber-400" />Site photos</p>
      <p className="text-xs text-neutral-400">Go to the office, not to the client. No signal? They wait on your phone and send themselves later.</p>
      {sites.length > 1 && <select value={site} onChange={e => setSite(e.target.value)} className="mt-3 w-full rounded-lg bg-white/10 px-3 py-2 text-sm">{sites.map(s => <option key={s.quoteId} value={s.quoteId} className="text-black">{s.name}</option>)}</select>}
      <input value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} placeholder="What's in the photo? (optional)" className="mt-3 w-full rounded-lg bg-white/10 px-3 py-2 text-sm placeholder:text-neutral-500" />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => add(e.target.files)} />
      <button onClick={() => fileRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-base font-black text-neutral-950"><Camera className="h-5 w-5" />Take or add photos</button>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-300">
        {waiting > 0 ? <>{sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudOff className="h-3.5 w-3.5" />}{waiting} photo{waiting === 1 ? "" : "s"} waiting to send{!online ? " – no signal" : ""}</> : sent > 0 ? <>✓ {sent} photo{sent === 1 ? "" : "s"} sent</> : null}
      </p>
      {error && <p className="mt-2 rounded-lg bg-red-600/80 px-3 py-2 text-xs">{error}</p>}
    </section>
  );
}
