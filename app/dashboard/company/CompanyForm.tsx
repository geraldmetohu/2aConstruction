"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { CompanyProfile } from "@/app/lib/takeoff/company";
import { saveCompany } from "./actions";

const groups: [string, [keyof CompanyProfile, string, string?][]][] = [
  ["Company", [["name", "Trading name"], ["registeredName", "Registered company name"], ["address", "Registered / trading address", "multi"], ["phone", "Phone"], ["email", "Email"], ["website", "Website"], ["companyNo", "Company number"], ["vatNo", "VAT number"], ["logoUrl", "Logo (path or https link)"], ["memberships", "Memberships & accreditations"]]],
  ["Insurance", [["insurer", "Insurer"], ["policyNo", "Policy number"], ["publicLiability", "Public liability cover (e.g. £5m)"], ["employersLiability", "Employer's liability cover (e.g. £10m)"], ["contractorsAllRisk", "Contract works / all risks cover"]]],
  ["Payments (shown on quotes and invoices)", [["bankName", "Bank"], ["accountName", "Account name"], ["sortCode", "Sort code"], ["accountNumber", "Account number"]]],
  ["Site & health and safety", [["siteManager", "Site manager"], ["siteManagerPhone", "Site manager phone"], ["healthSafetyLead", "Health & safety lead"], ["firstAider", "First aider"], ["workingHours", "Working hours"], ["disputeScheme", "Dispute resolution scheme"]]],
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
