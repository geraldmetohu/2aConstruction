"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { parseCsv, parsePdfText, type ParsedStatement, type PdfItem, type Suggestion } from "@/app/lib/finance/bank-parse";
import { CATEGORIES, CIS_RATE, VAT_LABEL, category, cisDeduction, type CisStatus, type VatTreatment } from "@/app/lib/finance/rules";
import { importStatementAction, reopenBankLineAction, sortBankLineAction } from "./actions";
import { Badge, btn, gbp, input, ukDay } from "./ui";
import type { JobOpt, WorkerOpt } from "./forms";

// pdf.js is loaded in the browser from cdnjs only when a PDF is chosen – the statement never leaves this device as a file.
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
type PdfJs = { GlobalWorkerOptions: { workerSrc: string }; getDocument(p: { data: ArrayBuffer }): { promise: Promise<{ numPages: number; getPage(n: number): Promise<{ getTextContent(): Promise<{ items: { str?: string; transform?: number[]; width?: number }[] }> }> }> } };
async function readPdf(file: File): Promise<PdfItem[][]> {
  const url = PDFJS;
  const pdfjs = (await import(/* webpackIgnore: true */ url)) as PdfJs;
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: PdfItem[][] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 60); n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    pages.push(content.items.filter(i => typeof i.str === "string" && i.transform).map(i => ({ str: i.str!, x: i.transform![4], y: i.transform![5], w: i.width ?? 0 })));
  }
  return pages;
}

export function BankUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [pending, setPending] = useState(false);
  const start = async (fn: () => Promise<void>) => { setPending(true); try { await fn(); } catch { setMsg({ ok: false, text: "Couldn't reach the server – try again." }); } finally { setPending(false); } };
  const [file, setFile] = useState<File | null>(null);
  const [st, setSt] = useState<ParsedStatement | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const choose = async (f: File | undefined) => {
    if (!f) return;
    setFile(f); setSt(null); setMsg(null); setBusy(true);
    try {
      const parsed = /\.pdf$/i.test(f.name) || f.type === "application/pdf" ? parsePdfText(await readPdf(f)) : parseCsv(await f.text());
      setSt(parsed);
    } catch (e) {
      setMsg({ ok: false, text: `Couldn't read that file${e instanceof Error ? ` (${e.message.slice(0, 120)})` : ""}. Try the CSV download from online banking.` });
    } finally { setBusy(false); }
  };
  const total = (k: "in" | "out") => st ? st.txns.filter(t => (k === "in" ? t.amount > 0 : t.amount < 0)).reduce((s, t) => s + Math.abs(t.amount), 0) : 0;
  return (
    <div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center hover:border-amber-400">
        {busy ? <Loader2 className="h-6 w-6 animate-spin text-amber-600" /> : <FileUp className="h-6 w-6 text-neutral-500" />}
        <span className="text-sm font-semibold">{busy ? "Reading the statement…" : file ? file.name : "Choose a bank statement (PDF or CSV)"}</span>
        <span className="text-xs text-neutral-500">Barclays, Lloyds, HSBC, NatWest and most UK banks. The PDF is read on this device; only the transactions are saved.</span>
        <input type="file" accept=".pdf,.csv,application/pdf,text/csv" className="sr-only" onChange={e => choose(e.target.files?.[0])} />
      </label>
      {st && <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold">{st.bank} · {st.txns.length} transaction{st.txns.length === 1 ? "" : "s"}{st.periodFrom ? ` · ${ukDay(st.periodFrom)} – ${ukDay(st.periodTo)}` : ""}</p>
          <p className="text-sm text-neutral-600">In {gbp(total("in"))} · Out {gbp(total("out"))}{st.openingBalance != null ? ` · Opening ${gbp(st.openingBalance)}` : ""}{st.closingBalance != null ? ` · Closing ${gbp(st.closingBalance)}` : ""}</p>
        </div>
        {st.warnings.map((w, i) => <p key={i} className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{w}</p>)}
        <ul className="mt-3 max-h-64 divide-y overflow-y-auto text-sm">{st.txns.slice(0, 200).map((t, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 py-1.5"><span className="w-20 shrink-0 text-xs text-neutral-500">{ukDay(t.date)}</span><span className="min-w-0 flex-1 truncate">{t.description}</span><span className={`shrink-0 tabular-nums font-semibold ${t.amount > 0 ? "text-emerald-700" : ""}`}>{gbp(t.amount)}</span></li>
        ))}</ul>
        <button disabled={pending || !st.txns.length} onClick={() => start(async () => {
          const r = await importStatementAction({ fileName: file?.name ?? "", bank: st.bank, periodFrom: st.periodFrom, periodTo: st.periodTo, openingBalance: st.openingBalance, closingBalance: st.closingBalance, txns: st.txns });
          if (r.ok) { setMsg({ ok: true, text: `Imported ${r.added} line${r.added === 1 ? "" : "s"}${r.duplicates ? ` (${r.duplicates} already imported before – skipped)` : ""}. Sort them below.` }); setSt(null); setFile(null); router.refresh(); }
          else setMsg({ ok: false, text: r.message });
        })} className={`${btn} mt-3 bg-amber-500 text-neutral-950`}>{pending ? "Importing…" : `Import ${st.txns.length} lines`}</button>
      </div>}
      {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
    </div>
  );
}

export interface LineView { id: string; date: string; description: string; amount: number; suggestions: Suggestion[] }
interface Opts { jobs: JobOpt[]; workers: WorkerOpt[]; recurring: { id: string; name: string; category: string; vatTreatment: VatTreatment }[] }

/** CIS on a bank payment to a subcontractor: work back from what left the bank to the labour before the deduction. */
function cisFromPaid(paid: number, materials: number, status: CisStatus) {
  const rate = CIS_RATE[status] / 100;
  if (!rate) return { labour: Math.max(0, paid - materials), deducted: 0 };
  let labour = Math.round(((paid - materials) / (1 - rate)) * 100) / 100;
  // nudge a penny either way so labour − deduction + materials is exactly what was paid
  for (const d of [0, 0.01, -0.01, 0.02, -0.02]) { const l = Math.round((labour + d) * 100) / 100; if (Math.abs(l + materials - cisDeduction(l, status) - paid) < 0.005) { labour = l; break; } }
  return { labour, deducted: cisDeduction(labour, status) };
}

function choiceFor(s: Suggestion, line: LineView, o: Opts): Record<string, unknown> {
  if (s.kind === "MATCH") return { kind: "MATCH", entryId: s.entryId ?? null, expenseId: s.expenseId ?? null, paymentId: s.paymentId ?? null };
  if (s.kind === "CLIENT_PAYMENT" && s.paymentId) return { kind: "CLIENT_PAYMENT", paymentId: s.paymentId };
  if (line.amount > 0 && s.categoryKey === "SALES" && s.quoteId) return { kind: "JOB_PAYMENT", quoteId: s.quoteId };
  const w = o.workers.find(x => x.id === s.workerId);
  const cat = category(s.categoryKey);
  const base = { kind: "ENTRY", category: cat.key, quoteId: s.quoteId ?? null, workerId: s.workerId ?? null, recurringId: s.recurringId ?? null, vatTreatment: o.recurring.find(r => r.id === s.recurringId)?.vatTreatment ?? cat.vat, counterparty: w?.name ?? "", description: line.description };
  if (w && w.cisStatus !== "NONE" && line.amount < 0) {
    const c = cisFromPaid(-line.amount, 0, w.cisStatus);
    return { ...base, category: "SUBCONTRACTOR", vatTreatment: w.vatNumber ? "REVERSE_CHARGE" : "OUTSIDE", cisLabour: c.labour, cisMaterials: 0, cisDeducted: c.deducted };
  }
  return base;
}

export function BankLines({ lines, opts }: { lines: LineView[]; opts: Opts }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const start = async (fn: () => Promise<void>) => { setPending(true); try { await fn(); } catch { setMsg({ ok: false, text: "Couldn't reach the server – try again." }); } finally { setPending(false); } };
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const sure = useMemo(() => lines.filter(l => l.suggestions[0]?.confidence >= 0.9), [lines]);
  const send = (line: LineView, choice: Record<string, unknown>, label: string) => start(async () => {
    const r = await sortBankLineAction(line.id, choice);
    if (r.ok) { setDone(d => new Set(d).add(line.id)); setOpen(null); setMsg({ ok: true, text: `${label} – done.` }); router.refresh(); }
    else setMsg({ ok: false, text: `${line.description.slice(0, 40)}: ${r.message}` });
  });
  const acceptAll = () => start(async () => {
    let n = 0; const errs: string[] = [];
    for (const l of sure) { const r = await sortBankLineAction(l.id, choiceFor(l.suggestions[0], l, opts)); if (r.ok) { n++; setDone(d => new Set(d).add(l.id)); } else errs.push(`${l.description.slice(0, 30)}: ${r.message}`); }
    setMsg({ ok: !errs.length, text: `${n} line${n === 1 ? "" : "s"} sorted.${errs.length ? ` ${errs.length} need a look: ${errs.slice(0, 3).join("; ")}` : ""}` });
    router.refresh();
  });
  const left = lines.filter(l => !done.has(l.id));
  if (!left.length) return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">All bank lines are sorted. Upload the next statement when it arrives.</p>;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-sm text-neutral-600"><strong>{left.length}</strong> to sort. Tap the suggestion if it's right, or “Other” to choose.</p>
        {sure.filter(l => !done.has(l.id)).length > 1 && <button disabled={pending} onClick={acceptAll} className={`${btn} ml-auto bg-neutral-900 text-white`}><Sparkles className="h-4 w-4" />Accept {sure.filter(l => !done.has(l.id)).length} sure matches</button>}
      </div>
      {msg && <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      <ul className="divide-y rounded-2xl border bg-white">
        {left.map(l => {
          const top = l.suggestions[0];
          return (
            <li key={l.id} className="p-3 sm:p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="w-20 text-xs text-neutral-500">{ukDay(l.date)}</span>
                <span className="min-w-0 flex-1 break-words text-sm font-medium">{l.description}</span>
                <span className={`tabular-nums text-base font-bold ${l.amount > 0 ? "text-emerald-700" : ""}`}>{gbp(l.amount)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {top && <button disabled={pending} onClick={() => send(l, choiceFor(top, l, opts), top.label)} className={`${btn} min-h-[36px] bg-emerald-600 py-1.5 text-white`}><Check className="h-4 w-4" />{top.label}<Badge tone={top.confidence >= 0.9 ? "green" : "amber"}>{Math.round(top.confidence * 100)}%</Badge></button>}
                {l.suggestions.slice(1, 3).map((s, i) => <button key={i} disabled={pending} onClick={() => send(l, choiceFor(s, l, opts), s.label)} className={`${btn} min-h-[36px] border bg-white py-1.5`}>{s.label}</button>)}
                <button onClick={() => setOpen(open === l.id ? null : l.id)} className={`${btn} min-h-[36px] border bg-white py-1.5`}>Other…</button>
                <button disabled={pending} onClick={() => send(l, { kind: "IGNORE", note: "" }, "Ignored")} className="text-xs font-semibold text-neutral-500 hover:underline">Ignore</button>
              </div>
              {open === l.id && <LineEditor line={l} opts={opts} busy={pending} onSave={(c, label) => send(l, c, label)} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LineEditor({ line, opts, busy, onSave }: { line: LineView; opts: Opts; busy: boolean; onSave: (c: Record<string, unknown>, label: string) => void }) {
  const dir = line.amount >= 0 ? "IN" : "OUT", paid = Math.abs(line.amount);
  const [f, setF] = useState({ category: dir === "IN" ? "SALES" : "MATERIALS", quoteId: "", workerId: "", recurringId: "", counterparty: "", vatTreatment: (dir === "IN" ? "STANDARD" : "STANDARD") as VatTreatment, materials: "", remember: true });
  const w = opts.workers.find(x => x.id === f.workerId);
  const cis = w && w.cisStatus !== "NONE" && dir === "OUT" ? cisFromPaid(paid, Number(f.materials) || 0, w.cisStatus) : null;
  const jobPayment = dir === "IN" && f.category === "SALES" && f.quoteId;
  const save = () => onSave(jobPayment ? { kind: "JOB_PAYMENT", quoteId: f.quoteId, remember: f.remember } : {
    kind: "ENTRY", category: f.category, quoteId: f.quoteId || null, workerId: f.workerId || null, recurringId: f.recurringId || null, vatTreatment: f.vatTreatment, counterparty: f.counterparty || w?.name || "",
    description: line.description, remember: f.remember, ...(cis ? { cisLabour: cis.labour, cisMaterials: Number(f.materials) || 0, cisDeducted: cis.deducted } : {}),
  }, category(f.category).label);
  return (
    <div className="mt-3 grid gap-3 rounded-xl bg-neutral-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm"><span className="mb-1 block text-xs font-semibold text-neutral-600">What is it</span>
        <select className={input} value={f.category} onChange={e => setF({ ...f, category: e.target.value, vatTreatment: category(e.target.value).vat })}>{CATEGORIES.filter(c => c.dir === dir).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
      <label className="text-sm"><span className="mb-1 block text-xs font-semibold text-neutral-600">Job</span>
        <select className={input} value={f.quoteId} onChange={e => setF({ ...f, quoteId: e.target.value })}><option value="">Company (no job)</option>{opts.jobs.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}</select></label>
      {dir === "OUT" && <label className="text-sm"><span className="mb-1 block text-xs font-semibold text-neutral-600">Worker / subcontractor</span>
        <select className={input} value={f.workerId} onChange={e => { const x = opts.workers.find(y => y.id === e.target.value); setF({ ...f, workerId: e.target.value, ...(x ? { category: x.cisStatus !== "NONE" || x.kind === "SUBCONTRACTOR" ? "SUBCONTRACTOR" : "LABOUR", vatTreatment: x.vatNumber && x.cisStatus !== "NONE" ? "REVERSE_CHARGE" : "OUTSIDE" } : {}) }); }}><option value="">—</option>{opts.workers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
      {dir === "OUT" && !f.workerId && opts.recurring.length > 0 && <label className="text-sm"><span className="mb-1 block text-xs font-semibold text-neutral-600">Regular cost</span>
        <select className={input} value={f.recurringId} onChange={e => { const r = opts.recurring.find(x => x.id === e.target.value); setF({ ...f, recurringId: e.target.value, ...(r ? { category: r.category, vatTreatment: r.vatTreatment, counterparty: r.name } : {}) }); }}><option value="">—</option>{opts.recurring.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
      {!jobPayment && <label className="text-sm"><span className="mb-1 block text-xs font-semibold text-neutral-600">VAT</span>
        <select className={input} value={f.vatTreatment} onChange={e => setF({ ...f, vatTreatment: e.target.value as VatTreatment })}>{(Object.keys(VAT_LABEL) as VatTreatment[]).map(t => <option key={t} value={t}>{VAT_LABEL[t]}</option>)}</select></label>}
      {!jobPayment && !w && <label className="text-sm"><span className="mb-1 block text-xs font-semibold text-neutral-600">{dir === "IN" ? "From" : "Paid to"}</span><input className={input} value={f.counterparty} onChange={e => setF({ ...f, counterparty: e.target.value })} /></label>}
      {cis && <>
        <label className="text-sm"><span className="mb-1 block text-xs font-semibold text-neutral-600">Materials in the payment (£)</span><input className={input} inputMode="decimal" value={f.materials} onChange={e => setF({ ...f, materials: e.target.value })} placeholder="0.00" /></label>
        <p className="self-end text-xs text-neutral-600 sm:col-span-2">Paid {gbp(paid)} = labour {gbp(cis.labour)} − CIS {CIS_RATE[w!.cisStatus]}% {gbp(cis.deducted)}{Number(f.materials) ? ` + materials ${gbp(Number(f.materials))}` : ""}. The {gbp(cis.deducted)} goes on the CIS return.</p>
      </>}
      <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4" checked={f.remember} onChange={e => setF({ ...f, remember: e.target.checked })} />Remember for next time</label>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4"><button disabled={busy} onClick={save} className={`${btn} bg-amber-500 text-neutral-950`}>Save</button>{jobPayment && <span className="text-xs text-neutral-600">Recorded as a payment on the job – the client gets a receipt.</span>}</div>
    </div>
  );
}

export function ReopenLine({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return <button disabled={pending} onClick={async () => { setPending(true); try { const r = await reopenBankLineAction(id); if (r.ok) router.refresh(); } finally { setPending(false); } }} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:underline"><RotateCcw className="h-3 w-3" />Undo</button>;
}
