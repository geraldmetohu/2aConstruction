"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronDown, CircleCheck, CircleX, ExternalLink, FileUp, Pencil, RefreshCw, Search, Sparkles } from "lucide-react";
import { importPriceList, findNow, monthlyRunNow, refreshNow, saveSupplierLink, acceptSuggestion, saveMaterialPrice } from "./actions";
import { SUPPLIER_IDS, searchTerms, searchUrl, supplierName, type SupplierId } from "@/app/lib/takeoff/supplier-parse";

type Link = { id: string; rateKey: string; supplier: SupplierId; url: string; packQuantity: number; vatIncluded: boolean; active: boolean };
type Obs = { linkId: string; rateKey: string; supplier: string; status: string; packPrice: number | null; unitPriceExVat: number | null; error: string | null; observedAt: string };
type Sug = { id: string; rateKey: string; supplier: SupplierId; url: string; productName: string; packPrice: number | null; imageUrl: string | null; packGuess: number; packSure: boolean; score: number; createdAt: string };
type Material = { key: string; name: string; unit: string; price: number; defaultPrice: number; edited: number | null; use: "EDITED" | "WEBSITE" };
const OLD: SupplierId[] = ["SELCO", "BUILDER_DEPOT"];
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function SupplierLinks({ storage, allMerchants, materials, links, observations, suggestions, cronConfigured }: {
  storage: boolean; allMerchants: boolean; materials: Material[]; links: Link[]; observations: Obs[]; suggestions: Sug[]; cronConfigured: boolean;
}) {
  const router = useRouter();
  const merchants = allMerchants ? SUPPLIER_IDS : OLD;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "edited" | "linked" | "unlinked" | "found">("all");
  const [busy, setBusy] = useState<"" | "check" | "month" | "import">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [csv, setCsv] = useState("");
  const linkedKeys = new Set(links.filter(l => l.active).map(l => l.rateKey));
  const foundKeys = new Set(suggestions.filter(s => !links.some(l => l.active && l.rateKey === s.rateKey && l.supplier === s.supplier && l.url === s.url)).map(s => s.rateKey));
  // Edited prices first (easy to find), then everything else A–Z.
  const shown = useMemo(() => materials.filter(m => (!q || m.name.toLowerCase().includes(q.toLowerCase()))
    && (filter === "all" || (filter === "edited" ? m.edited !== null : filter === "linked" ? linkedKeys.has(m.key) : filter === "unlinked" ? !linkedKeys.has(m.key) : foundKeys.has(m.key))))
    .sort((a, b) => (a.edited !== null ? 0 : 1) - (b.edited !== null ? 0 : 1) || a.name.localeCompare(b.name)).slice(0, 150), [materials, q, filter, linkedKeys, foundKeys]);
  const editedCount = materials.filter(m => m.edited !== null).length;
  const linked = links.filter(l => l.active).length;

  async function check() {
    setBusy("check"); setMsg(null);
    const r = await refreshNow(); setBusy("");
    setMsg(r.ok ? { ok: !r.failed.length, text: `Checked ${r.checked}: ${r.updated} updated${r.failed.length ? `, ${r.failed.length} failed – ${r.failed.slice(0, 3).join("; ")}` : ""}.${r.checked === 0 ? " Everything was checked in the last 20 hours." : ""}` } : { ok: false, text: r.message });
    router.refresh();
  }
  async function month() {
    setBusy("month"); setMsg(null);
    const r = await monthlyRunNow(); setBusy("");
    setMsg(r.ok ? { ok: !r.failed.length, text: `Re-checked ${r.checked} linked products (${r.updated} updated). Found ${r.found.length} new product${r.found.length === 1 ? "" : "s"} to confirm below${r.notFound.length ? `; ${r.notFound.length} not found – ${r.notFound.slice(0, 2).join("; ")}` : ""}.${r.remaining ? " More to do – run again." : ""}` } : { ok: false, text: r.message });
    router.refresh();
  }
  async function doImport() {
    setBusy("import"); setMsg(null);
    const r = await importPriceList(csv); setBusy("");
    setMsg(r.ok ? { ok: !r.problems.length, text: `Imported ${r.imported} price${r.imported === 1 ? "" : "s"}.${r.problems.length ? ` Skipped: ${r.problems.join("; ")}` : ""}` } : { ok: false, text: r.message });
    if (r.ok) setCsv("");
    router.refresh();
  }
  async function file(f: File | undefined) { if (f) setCsv((await f.text()).slice(0, 500_000)); }

  return (
    <div className="space-y-5">
      <header className="space-y-3 rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">Supplier prices</h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-600">Prices update automatically on the <strong>1st of every month</strong>: every linked product page is read again, and materials with no link are searched for on Screwfix, Toolstation, Selco and Builder Depot. You confirm each product found (and its pack size) once; after that it updates itself. Quotes use the cheapest website price, ex VAT – unless you type your own price, which then goes to the top of the list and is used instead (tap the website price to switch back). {linked} product{linked === 1 ? "" : "s"} linked.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={!storage || !!busy || !linked} onClick={check} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${busy === "check" ? "animate-spin" : ""}`} />{busy === "check" ? "Checking…" : "Check linked prices"}</button>
            <button disabled={!storage || !!busy} onClick={month} className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><CalendarClock className={`h-4 w-4 ${busy === "month" ? "animate-pulse" : ""}`} />{busy === "month" ? "Running (≈ 2 min)…" : "Run the monthly update now"}</button>
          </div>
        </div>
        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg.text}</p>}
        {!storage && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Needs the new database tables (migration 20261101120000_add_takeoff_quotes).</p>}
        {storage && !allMerchants && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Apply migration <code>20261110120000_more_suppliers</code> to add Screwfix, Toolstation, Travis Perkins, Wickes, Jewson, B&amp;Q, MKM, City Plumbing, CEF and Topps Tiles, and automatic product finding. Until then only Selco and Builder Depot links work.</p>}
        {storage && !cronConfigured && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Monthly automatic run: set <code>CRON_SECRET</code> in Vercel (Settings → Environment Variables). The schedule is in <code>vercel.json</code> (04:00 on the 1st, and the 2nd to finish). Until then use the buttons above.</p>}
        <p className="text-xs text-neutral-500">Some merchants block automatic reading of their pages or don't allow it in their robots.txt – those show an error on the product and are skipped. For them, import the price list from your trade account below; it's the most reliable source of your own trade prices.</p>
      </header>

      <details className="rounded-2xl border bg-white p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-bold"><FileUp className="h-4 w-4 text-amber-600" />Import a price list (CSV)</summary>
        <p className="mt-2 text-xs text-neutral-600">Columns: <code>rateKey</code> (or the material name as shown below), <code>supplier</code> (e.g. Selco, Screwfix), <code>price</code> (per pack), and optionally <code>packQuantity</code>, <code>vatIncluded</code> (yes/no) and <code>url</code>. Example: <code>rateKey,supplier,price,packQuantity,vatIncluded</code> / <code>plasterboard_125,Selco,9.85,1,no</code></p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="file" accept=".csv,text/csv" onChange={e => file(e.target.files?.[0])} className="text-xs" />
        </div>
        <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={5} className="mt-2 w-full rounded-lg border px-3 py-2 font-mono text-xs" placeholder="rateKey,supplier,price,packQuantity,vatIncluded" />
        <button disabled={!storage || !csv.trim() || !!busy} onClick={doImport} className="mt-2 rounded-full bg-neutral-950 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">{busy === "import" ? "Importing…" : "Import prices"}</button>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm"><Search className="h-4 w-4 text-neutral-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search materials" className="w-48 outline-none" /></label>
        {([["all", "All"], ["edited", `Edited (${editedCount})`], ["linked", "Linked"], ["unlinked", "Not linked"], ["found", `Found – to confirm (${foundKeys.size})`]] as const).map(([k, l]) =>
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === k ? "border-amber-500 bg-amber-500 text-neutral-950" : "bg-white"}`}>{l}</button>)}
        {shown.length === 150 && <span className="text-xs text-neutral-500">Showing the first 150 – search to narrow down</span>}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="hidden grid-cols-[minmax(0,1fr)_13rem_13rem_6rem] gap-4 border-b bg-neutral-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500 md:grid">
          <span>Material</span><span>Website price</span><span>Your price</span><span className="text-right">Links</span>
        </div>
        {shown.map((m, i) => {
          const edited = m.edited !== null, prev = shown[i - 1];
          return <div key={m.key}>
            {i === 0 && edited && <p className="bg-amber-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">Edited prices</p>}
            {!edited && prev && prev.edited !== null && <p className="border-t bg-neutral-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">All materials</p>}
            <PriceRow m={m} links={links.filter(l => l.rateKey === m.key && l.active)} observations={observations} disabled={!storage} onSaved={() => router.refresh()}>
              <MaterialCard m={m} merchants={merchants} links={links.filter(l => l.rateKey === m.key)} observations={observations} suggestions={suggestions.filter(s => s.rateKey === m.key)} disabled={!storage} canFind={allMerchants} onSaved={() => router.refresh()} />
            </PriceRow>
          </div>;
        })}
        {!shown.length && <p className="p-8 text-center text-sm text-neutral-500">No materials match.</p>}
      </div>
    </div>
  );
}

const gbp = (n: number) => `£${n.toFixed(2)}`;

/** One material: full name, website price with Reference buttons, your edited price, and which one quotes use – side by side. */
function PriceRow({ m, links, observations, disabled, onSaved, children }: { m: Material; links: Link[]; observations: Obs[]; disabled: boolean; onSaved: () => void; children: ReactNode }) {
  const web = links.map(l => ({ l, o: observations.find(o => o.linkId === l.id && o.status === "OK" && o.unitPriceExVat != null) }))
    .filter((x): x is { l: Link; o: Obs } => !!x.o).sort((a, b) => a.o.unitPriceExVat! - b.o.unitPriceExVat!);
  const best = web[0];
  const webPrice = best ? Math.round(best.o.unitPriceExVat! * 100) / 100 : null;
  const [val, setVal] = useState(m.edited !== null ? m.edited.toFixed(2) : "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const typed = val.trim() === "" ? null : Number(val.replace(/[£,\s]/g, ""));
  const dirty = typed !== m.edited && !(typed === null && m.edited === null);
  const using: "EDITED" | "WEBSITE" | "DEFAULT" = m.edited !== null ? (m.use === "WEBSITE" && webPrice !== null ? "WEBSITE" : "EDITED") : webPrice !== null ? "WEBSITE" : "DEFAULT";
  const usedPrice = using === "EDITED" ? m.edited! : using === "WEBSITE" ? webPrice! : m.defaultPrice;
  async function save(price: number | null, use: "EDITED" | "WEBSITE") {
    if (price !== null && !(Number.isFinite(price) && price >= 0)) { setErr("Enter a price in pounds."); return; }
    setBusy(true); setErr("");
    const r = await saveMaterialPrice(m.key, price, use); setBusy(false);
    if (!r.ok) setErr(r.message); else onSaved();
  }
  const diff = m.edited !== null && webPrice !== null ? m.edited - webPrice : null;
  const pick = (side: "EDITED" | "WEBSITE") => `rounded-xl border p-2.5 text-left transition ${using === side ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "bg-white hover:border-neutral-400"}`;
  return (
    <div className={`border-t px-4 py-3 first:border-t-0 ${m.edited !== null ? "bg-amber-50/40" : ""}`}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_13rem_6rem] md:items-center md:gap-4">
        <div className="min-w-0">
          <p className="font-semibold leading-snug text-neutral-900">{m.name}</p>
          <p className="mt-0.5 text-xs text-neutral-500">per {m.unit} · quotes use <strong className="text-neutral-900">{gbp(usedPrice)}</strong>{using === "DEFAULT" ? " (standard price)" : using === "EDITED" ? " (your price)" : " (website)"}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:contents">
          {/* Website price */}
          <div className={webPrice !== null && m.edited !== null ? pick("WEBSITE") + " cursor-pointer" : "rounded-xl border border-dashed p-2.5"} onClick={() => webPrice !== null && m.edited !== null && using !== "WEBSITE" && !busy && save(m.edited, "WEBSITE")}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 md:hidden">Website</p>
            {best ? <>
              <p className="text-lg font-black tabular-nums text-neutral-900">{gbp(webPrice!)}</p>
              <p className="text-[11px] text-neutral-500">{supplierName(best.l.supplier)} · ex VAT · {when(best.o.observedAt)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">{web.slice(0, 3).map(({ l, o }) =>
                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title={`${supplierName(l.supplier)} – ${gbp(o.unitPriceExVat!)}`}
                  className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600"><ExternalLink className="h-3 w-3" />Reference{web.length > 1 ? ` · ${supplierName(l.supplier)}` : ""}</a>)}</div>
            </> : <p className="text-xs text-neutral-400">No website price yet</p>}
            {m.edited !== null && webPrice !== null && <p className={`mt-1 text-[11px] font-bold ${using === "WEBSITE" ? "text-emerald-700" : "text-neutral-400"}`}>{using === "WEBSITE" ? "✓ In use" : "Tap to use"}</p>}
          </div>
          {/* Your price */}
          <div className={m.edited !== null && webPrice !== null ? pick("EDITED") + " cursor-pointer" : "rounded-xl border p-2.5"} onClick={() => m.edited !== null && webPrice !== null && using !== "EDITED" && !busy && !dirty && save(m.edited, "EDITED")}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 md:hidden">Your price</p>
            <label className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <span className="text-lg font-black text-neutral-400">£</span>
              <input value={val} disabled={disabled || busy} onChange={e => setVal(e.target.value)} inputMode="decimal" placeholder={m.defaultPrice.toFixed(2)}
                onKeyDown={e => { if (e.key === "Enter" && dirty) save(typed, "EDITED"); }}
                className="w-full min-w-0 rounded-md border bg-white px-2 py-1 text-base font-bold tabular-nums outline-none focus:border-amber-500" />
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5" onClick={e => e.stopPropagation()}>
              {dirty && <button disabled={disabled || busy} onClick={() => save(typed, "EDITED")} className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-neutral-950">{busy ? "Saving…" : "Save price"}</button>}
              {m.edited !== null && !dirty && <button disabled={disabled || busy} onClick={() => { setVal(""); save(null, "EDITED"); }} className="text-[11px] text-neutral-500 underline">Clear edit</button>}
              {m.edited === null && !dirty && <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400"><Pencil className="h-3 w-3" />Type to edit</span>}
            </div>
            {m.edited !== null && webPrice !== null && <p className={`mt-1 text-[11px] font-bold ${using === "EDITED" ? "text-emerald-700" : "text-neutral-400"}`}>{using === "EDITED" ? "✓ In use" : "Tap to use"}{diff !== null && Math.abs(diff) >= 0.01 ? <span className="ml-1 font-normal text-neutral-500">· {gbp(Math.abs(diff))} {diff > 0 ? "more" : "less"} than website</span> : null}</p>}
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} className="inline-flex items-center justify-center gap-1 justify-self-start rounded-full border px-3 py-1.5 text-xs font-semibold md:justify-self-end">
          {links.length} link{links.length === 1 ? "" : "s"}<ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} /></button>
      </div>
      {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function MaterialCard({ m, merchants, links, observations, suggestions, disabled, canFind, onSaved }: { m: Material; merchants: readonly SupplierId[]; links: Link[]; observations: Obs[]; suggestions: Sug[]; disabled: boolean; canFind: boolean; onSaved: () => void }) {
  const used = links.filter(l => l.active).map(l => l.supplier);
  const [extra, setExtra] = useState<SupplierId[]>([]);
  const show = merchants.filter(s => used.includes(s) || extra.includes(s) || suggestions.some(x => x.supplier === s));
  const rows = show.length ? show : (["SELCO", "BUILDER_DEPOT"] as SupplierId[]).filter(s => merchants.includes(s));
  const add = merchants.filter(s => !rows.includes(s));
  return (
    <section className="rounded-xl border bg-neutral-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Merchant links for this material</p>
      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        {rows.map(s => {
          const link = links.find(l => l.supplier === s);
          const obs = link ? observations.find(o => o.linkId === link.id) : undefined;
          const sug = suggestions.find(x => x.supplier === s && !(link?.active && link.url === x.url));
          return <LinkRow key={s} supplier={s} m={m} link={link} obs={obs} sug={sug} disabled={disabled} canFind={canFind} onSaved={onSaved} />;
        })}
      </div>
      {add.length > 0 && <label className="mt-2 flex items-center gap-2 text-xs text-neutral-600">Add a merchant:
        <select className="rounded border px-1.5 py-0.5" value="" onChange={e => e.target.value && setExtra(x => [...x, e.target.value as SupplierId])}>
          <option value="">Choose…</option>{add.map(s => <option key={s} value={s}>{supplierName(s)}</option>)}
        </select></label>}
    </section>
  );
}

function LinkRow({ supplier, m, link, obs, sug, disabled, canFind, onSaved }: { supplier: SupplierId; m: Material; link?: Link; obs?: Obs; sug?: Sug; disabled: boolean; canFind: boolean; onSaved: () => void }) {
  const [url, setUrl] = useState(link?.url ?? "");
  const [pack, setPack] = useState(String(link?.packQuantity ?? 1));
  const [vat, setVat] = useState(link?.vatIncluded ?? true);
  const [sugPack, setSugPack] = useState(String(sug?.packGuess ?? 1));
  const [err, setErr] = useState("");
  const [finding, setFinding] = useState(false);
  const [editUrl, setEditUrl] = useState(false);
  const changed = url !== (link?.url ?? "") || Number(pack) !== (link?.packQuantity ?? 1) || vat !== (link?.vatIncluded ?? true);
  async function save() {
    setErr("");
    const r = await saveSupplierLink({ rateKey: m.key, supplier, url: url.trim(), packQuantity: Number(pack) || 1, vatIncluded: vat, active: !!url.trim() });
    if (!r.ok) setErr(r.message); else { setEditUrl(false); onSaved(); }
  }
  async function find() {
    setErr(""); setFinding(true);
    const r = await findNow(m.key, supplier); setFinding(false);
    if (!r.ok) setErr(r.message); else onSaved();
  }
  async function accept() {
    setErr("");
    const r = await acceptSuggestion(sug!.id, Number(sugPack) || 1, true);
    if (!r.ok) setErr(r.message); else onSaved();
  }
  return (
    <div className="rounded-lg border bg-white p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{supplierName(supplier)}</p>
        <div className="flex items-center gap-2 text-xs">
          <a href={searchUrl(supplier, searchTerms(m.name))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900"><ExternalLink className="h-3 w-3" />Search site</a>
          {canFind && <button disabled={disabled || finding} onClick={find} className="inline-flex items-center gap-1 font-semibold text-amber-700 disabled:opacity-40"><Sparkles className="h-3 w-3" />{finding ? "Finding…" : "Find automatically"}</button>}
        </div>
      </div>
      {link?.active && link.url && !editUrl
        ? <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"><ExternalLink className="h-3 w-3" />Reference</a>
            <button disabled={disabled} onClick={() => setEditUrl(true)} className="text-xs text-neutral-500 underline">Change link</button>
          </div>
        : <input disabled={disabled} value={url} onChange={e => setUrl(e.target.value)} placeholder={`Paste the ${supplierName(supplier)} product page link`} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-xs" />}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1">Pack contains <input disabled={disabled} value={pack} onChange={e => setPack(e.target.value)} className="w-14 rounded border px-1.5 py-0.5 text-right" inputMode="decimal" /> {m.unit}</label>
        <label className="flex items-center gap-1"><input disabled={disabled} type="checkbox" checked={vat} onChange={e => setVat(e.target.checked)} /> Page price includes VAT</label>
        {changed && <button disabled={disabled} onClick={save} className="ml-auto rounded-full bg-neutral-950 px-3 py-1 font-semibold text-white">Save</button>}
      </div>
      {sug && <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs">
        <p className="flex items-start gap-2">{sug.imageUrl && <img src={sug.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded border bg-white object-contain" loading="lazy" />}
          <span><strong>Found:</strong> {sug.productName}{sug.packPrice ? <strong> – £{sug.packPrice.toFixed(2)}</strong> : ""} <span className="text-neutral-500">({Math.round(sug.score * 100)}% match, {when(sug.createdAt)})</span>
            <a href={sug.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white"><ExternalLink className="h-3 w-3" />Reference</a></span></p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1">Pack contains <input value={sugPack} onChange={e => setSugPack(e.target.value)} className="w-14 rounded border px-1.5 py-0.5 text-right" inputMode="decimal" /> {m.unit}</label>
          {!sug.packSure && <span className="text-amber-800">check the pack size</span>}
          <button disabled={disabled} onClick={accept} className="ml-auto rounded-full bg-amber-500 px-3 py-1 font-semibold text-neutral-950">Use this product</button>
        </div>
      </div>}
      {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
      {obs && <p className={`mt-2 flex items-center gap-1 text-xs ${obs.status === "OK" ? "text-emerald-800" : "text-amber-800"}`}>
        {obs.status === "OK" ? <CircleCheck className="h-3.5 w-3.5 shrink-0" /> : <CircleX className="h-3.5 w-3.5 shrink-0" />}
        {obs.status === "OK" ? `£${obs.packPrice?.toFixed(2)} per pack → £${obs.unitPriceExVat?.toFixed(2)} ex VAT per ${m.unit}` : obs.error}
        <span className="text-neutral-500"> · {when(obs.observedAt)}</span></p>}
    </div>
  );
}
