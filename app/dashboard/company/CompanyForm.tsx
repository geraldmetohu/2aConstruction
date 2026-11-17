"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Plus, Save, Star, Trash2 } from "lucide-react";
import { SIGNATORY_ROLES, type CompanyProfile, type Signatory } from "@/app/lib/takeoff/company";
import { UploadButton } from "@/app/lib/uploadthing";
import { saveCompany } from "./actions";

type TextKey = { [K in keyof CompanyProfile]: CompanyProfile[K] extends string ? K : never }[keyof CompanyProfile];
const groups: [string, [TextKey, string, string?][]][] = [
  ["Company", [["name", "Trading name"], ["registeredName", "Registered company name"], ["address", "Registered / trading address", "multi"], ["phone", "Phone"], ["email", "Email"], ["website", "Website"], ["companyNo", "Company number"], ["vatNo", "VAT number"], ["logoUrl", "Logo (path or https link)"], ["memberships", "Memberships & accreditations"]]],
  ["Insurance", [["insurer", "Insurer"], ["policyNo", "Policy number"], ["publicLiability", "Public liability cover (e.g. £5m)"], ["employersLiability", "Employer's liability cover (e.g. £10m)"], ["contractorsAllRisk", "Contract works / all risks cover"]]],
  ["Payments (shown on quotes and invoices)", [["bankName", "Bank"], ["accountName", "Account name"], ["sortCode", "Sort code"], ["accountNumber", "Account number"]]],
  ["Site & health and safety", [["siteManager", "Site manager"], ["siteManagerPhone", "Site manager phone"], ["healthSafetyLead", "Health & safety lead"], ["firstAider", "First aider"], ["workingHours", "Working hours"], ["disputeScheme", "Dispute resolution scheme"]]],
  ["Management system & tenders (ISO 9001 / 14001 / 45001)", [["director", "Managing director (signs the policies)"], ["employees", "Number of employees (incl. directors)"], ["imsStart", "Management system start date (e.g. 2026-11-16)"],
    ["wasteCarrier", "Waste carrier registration number"], ["accreditations", "Accreditations held (e.g. CHAS, Constructionline Silver, ISO 9001 – only what you actually hold)", "multi"],
    ["imsScope", "Scope of the management system (what work, where)", "multi"]]],
];

export function CompanyForm({ company, version, storage }: { company: CompanyProfile; version: number; storage: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(company);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div><h1 className="text-2xl font-black">Company &amp; documents</h1>
        <p className="mt-1 text-sm text-neutral-600">These details appear on every quotation, contract, guarantee and health &amp; safety document. Each save is kept as a new version.</p></div>
      {!storage && <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">Saving needs the new database tables (migration 20261101120000_add_takeoff_quotes). Documents use the details below until then.</p>}
      {msg && <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-bold">Quotes</h2>
        <p className="mt-1 text-xs text-neutral-500">How new quotes set out the price. A client you have quoted before gets the layout of their last quote; you can change it on any quote.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-neutral-700">Default layout
            <select className={input} value={v.quoteFormat} onChange={e => setV({ ...v, quoteFormat: e.target.value as CompanyProfile["quoteFormat"] })}>
              <option value="SIMPLE">Simple – each activity and its price</option><option value="NORMAL">Normal – grouped, with what each step includes</option><option value="ITEMISED">Itemised – every product and job priced</option></select></label>
          <label className="text-xs font-semibold text-neutral-700">Group the scope by
            <select className={input} value={v.quoteGroupBy} onChange={e => setV({ ...v, quoteGroupBy: e.target.value as CompanyProfile["quoteGroupBy"] })}>
              <option value="AREA">Room / project</option><option value="TRADE">Trade</option></select></label>
        </div>
      </section>
      <Signatories v={v} setV={setV} input={input} />
      {groups.map(([title, fields]) => (
        <section key={title} className="rounded-xl border bg-white p-5">
          <h2 className="font-bold">{title}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {fields.map(([k, l, kind]) => (
              <label key={k} className={`text-xs font-semibold text-neutral-700 ${kind === "multi" ? "sm:col-span-2" : ""}`}>{l}
                {kind === "multi" ? <textarea rows={3} className={input} value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} />
                  : <input className={input} value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} />}
              </label>
            ))}
          </div>
        </section>
      ))}
      <button disabled={busy || !storage} onClick={async () => { setBusy(true); const r = await saveCompany(version, v); setBusy(false); setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.message }); if (r.ok) router.refresh(); }}
        className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" />Save company details</button>
    </div>
  );
}

/** People who sign documents, each with an uploaded signature; one is the default for quotes. */
function Signatories({ v, setV, input }: { v: CompanyProfile; setV: (c: CompanyProfile) => void; input: string }) {
  const [err, setErr] = useState("");
  const [up, setUp] = useState("");
  const list = v.signatories ?? [];
  const set = (id: string, patch: Partial<Signatory>) => setV({ ...v, signatories: list.map(x => x.id === id ? { ...x, ...patch } : x) });
  const add = () => { const id = `s${Date.now().toString(36)}`; setV({ ...v, signatories: [...list, { id, name: "", role: "", signatureUrl: "" }], defaultSignatory: v.defaultSignatory || id }); };
  const remove = (id: string) => setV({ ...v, signatories: list.filter(x => x.id !== id), defaultSignatory: v.defaultSignatory === id ? "" : v.defaultSignatory });
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 font-bold"><FileSignature className="h-4 w-4 text-amber-600" />Signatures</h2>
          <p className="mt-1 text-xs text-neutral-500">Who signs for the company – CEO, CTO, project manager, site supervisor… Upload a signature (a photo or scan of it on white paper; a PNG with a clear background looks best). The star marks who signs quotes by default; pick someone else on any quote, or for many quotes at once on Saved quotes.</p></div>
        <button type="button" onClick={add} disabled={list.length >= 12} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add signatory</button>
      </div>
      {err && <p className="mt-2 rounded bg-red-50 px-3 py-1.5 text-xs text-red-700">{err}</p>}
      {!list.length && <p className="mt-3 text-sm text-neutral-500">No signatories yet – documents keep blank signature lines.</p>}
      <datalist id="signatory-roles">{SIGNATORY_ROLES.map(r => <option key={r} value={r} />)}</datalist>
      <ul className="mt-3 space-y-3">{list.map(x => (
        <li key={x.id} className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_14rem_auto] ${v.defaultSignatory === x.id ? "border-amber-400 bg-amber-50/40" : ""}`}>
          <label className="text-xs font-semibold text-neutral-700">Name<input className={input} value={x.name} placeholder="e.g. Aleksios …" onChange={e => set(x.id, { name: e.target.value })} /></label>
          <label className="text-xs font-semibold text-neutral-700">Role<input className={input} list="signatory-roles" value={x.role} placeholder="e.g. Chief Executive Officer (CEO)" onChange={e => set(x.id, { role: e.target.value })} /></label>
          <div className="text-xs font-semibold text-neutral-700">Signature
            <div className="mt-1 flex h-[4.5rem] items-center justify-center rounded-lg border border-dashed bg-white p-1">
              {x.signatureUrl ? <img src={x.signatureUrl} alt={`Signature of ${x.name}`} className="max-h-full max-w-full object-contain" />
                : <UploadButton endpoint="imageUploader" config={{ mode: "auto" }} content={{ button: () => <span>{up === x.id ? "Uploading…" : "Upload signature"}</span> }}
                    onUploadBegin={() => { setUp(x.id); setErr(""); }}
                    onClientUploadComplete={(res: unknown[]) => { setUp(""); const f = (res as { ufsUrl?: string; url?: string }[])[0]; set(x.id, { signatureUrl: f?.ufsUrl || f?.url || "" }); }}
                    onUploadError={(e: unknown) => { setUp(""); setErr((e instanceof Error && e.message) || "Upload failed."); }}
                    appearance={{ button: "rounded-full border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 ut-uploading:opacity-60", allowedContent: "hidden" }} />}
            </div>
            {x.signatureUrl && <button type="button" onClick={() => set(x.id, { signatureUrl: "" })} className="mt-1 text-[11px] font-normal text-neutral-500 underline">Replace</button>}
          </div>
          <div className="flex items-end gap-1 sm:flex-col sm:items-end sm:justify-between">
            <button type="button" title="Signs quotes by default" onClick={() => setV({ ...v, defaultSignatory: x.id })} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${v.defaultSignatory === x.id ? "bg-amber-500 text-neutral-950" : "border text-neutral-600"}`}><Star className="h-3.5 w-3.5" />{v.defaultSignatory === x.id ? "Default" : "Make default"}</button>
            <button type="button" onClick={() => remove(x.id)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Remove</button>
          </div>
        </li>))}</ul>
      <p className="mt-2 text-[11px] text-neutral-500">Press “Save company details” below to keep changes.</p>
    </section>
  );
}
