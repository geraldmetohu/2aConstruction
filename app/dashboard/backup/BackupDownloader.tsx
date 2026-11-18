"use client";
import { useState } from "react";
import { Database, Download, Loader2 } from "lucide-react";
import { rowsToCsv, zip } from "@/app/lib/backup/zip";

type Table = { name: string; rows: number };

/** Downloads every table in chunks and saves one ZIP: JSON (complete) + CSV (opens in Excel) per table. */
export function BackupDownloader() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; table: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      const m = await fetch("/api/backup/tables", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error("Not allowed – sign in as admin again."); return r.json() as Promise<{ createdAt: string; tables: Table[]; excluded: string[] }>; });
      const total = m.tables.reduce((s, t) => s + t.rows, 0); let done = 0;
      const enc = new TextEncoder(), files: { name: string; data: Uint8Array }[] = [];
      for (const t of m.tables) {
        const rows: Record<string, unknown>[] = [];
        let offset: number | null = 0;
        while (offset !== null) {
          setProgress({ done, total, table: t.name });
          const c: { rows: Record<string, unknown>[]; next: number | null } = await fetch(`/api/backup/chunk?table=${encodeURIComponent(t.name)}&offset=${offset}`, { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(`Could not read ${t.name}.`); return r.json(); });
          rows.push(...c.rows); done += c.rows.length; offset = c.next;
        }
        files.push({ name: `json/${t.name}.json`, data: enc.encode(JSON.stringify(rows, null, 1)) });
        files.push({ name: `csv/${t.name}.csv`, data: enc.encode(rowsToCsv(rows)) });
      }
      const stamp = m.createdAt.slice(0, 16).replace(/[:T]/g, "-");
      files.unshift({ name: "README.txt", data: enc.encode(`2A Construction – database backup\r\nMade ${new Date(m.createdAt).toLocaleString("en-GB")}\r\n\r\njson/ – every table, complete (best for restoring).\r\ncsv/ – the same tables to open in Excel.\r\nNot included (security tokens): ${m.excluded.join(", ")}.\r\n\r\nKeep this file somewhere safe – it contains client names, addresses and money.\r\n\r\n${m.tables.map(t => `${t.name}: ${t.rows} rows`).join("\r\n")}\r\n`) });
      const blob = zip(files);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `2A-backup-${stamp}.zip`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      setMsg({ ok: true, text: `Backup saved: ${m.tables.length} tables, ${total.toLocaleString("en-GB")} rows (${(blob.size / 1024 / 1024).toFixed(1)} MB).` });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Backup failed." }); }
    setBusy(false); setProgress(null);
  };
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="flex items-center gap-2 font-bold"><Database className="h-4 w-4 text-amber-600" />Download now</h2>
      <p className="mt-1 text-sm text-neutral-600">Saves a ZIP to this computer with every table: JSON (complete) and CSV (opens in Excel). Read-only – nothing in the database changes.</p>
      <button disabled={busy} onClick={run} className="mt-3 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{busy ? "Downloading…" : "Download backup"}</button>
      {progress && <div className="mt-3"><div className="h-2 rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} /></div><p className="mt-1 text-xs text-neutral-500">{progress.table} · {progress.done.toLocaleString("en-GB")} of {progress.total.toLocaleString("en-GB")} rows</p></div>}
      {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
    </section>
  );
}
