"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertAcceptedQuote } from "./actions";
type Props = { quoteId: string; revisionId: string; version: number; title: string; customerName: string; releasedAt: string; validUntil: string; baseGross: string; optional: { key: string; description: string; gross: string }[]; clients: { id: string; fullName: string; email: string }[] };
const field = "mt-1 w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm";
export function ConversionForm(props: Props) {
  const router = useRouter();
  const [optional, setOptional] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pence = (v: string) => BigInt(v.replace(".", ""));
  const gross = (pence(props.baseGross) + props.optional.filter(o => optional.includes(o.key)).reduce((n, o) => n + pence(o.gross), BigInt(0))).toString().padStart(3, "0");
  return <form onSubmit={async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage("");
    try {
      const date = new Date(String(form.get("acceptedAt")));
      if (!Number.isFinite(date.getTime())) { setMessage("Enter a valid acceptance date and time."); return; }
      const result = await convertAcceptedQuote({ quoteId: props.quoteId, revisionId: props.revisionId, projectName: String(form.get("projectName")), acceptedAt: date.toISOString(), acceptedBy: String(form.get("acceptedBy")), evidence: String(form.get("evidence")), confirmed: form.get("confirmed") === "on", approvedOptionalKeys: optional, ...(form.get("existingClientId") ? { existingClientId: String(form.get("existingClientId")) } : {}) });
      if (result.ok) router.push(`/dashboard/delivery-projects/${result.id}`); else setMessage(result.message);
    } catch { setMessage("Connection interrupted. Reload and check the project list before retrying; conversion is safe to retry."); } finally { setBusy(false); }
  }} className="space-y-6">
    <fieldset disabled={busy} className="min-w-0 space-y-6">
      <div className="rounded-2xl bg-amber-50 p-5"><h2 className="font-bold">Record an acceptance already received</h2><p className="mt-2 text-sm">Use the customer&apos;s written approval for revision {props.version}. This records the evidence and creates the project; it does not accept the quote on their behalf.</p><p className="mt-2 text-sm">Released {props.releasedAt} · Valid until {props.validUntil}</p></div>
      <label className="block text-sm font-semibold">Project name<input required minLength={3} maxLength={200} name="projectName" defaultValue={props.title} className={field} /></label>
      <label className="block text-sm font-semibold">Client record<select name="existingClientId" className={field} defaultValue={props.clients.length === 1 ? props.clients[0].id : ""}><option value="">{props.clients.length ? "Select the matching client" : "Create client identity from quote"}</option>{props.clients.map(c => <option key={c.id} value={c.id}>{c.fullName} · {c.email}</option>)}</select></label>
      <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-semibold">Accepted by<input name="acceptedBy" required minLength={2} maxLength={200} defaultValue={props.customerName} className={field} /></label><label className="block text-sm font-semibold">Acceptance date and time (your local time)<input name="acceptedAt" required type="datetime-local" className={field} /></label></div>
      <label className="block text-sm font-semibold">Written acceptance reference and details<textarea name="evidence" required minLength={10} maxLength={4000} rows={4} className={field} placeholder="For example: email date, subject and reference confirming this revision and the optional work below." /></label>
      <section className="rounded-2xl border p-5"><h2 className="font-bold">Approved optional work</h2><p className="mt-2 text-sm text-neutral-600">Select only options expressly approved by the customer. Unselected options and excluded work will not become tasks or requirements.</p>{props.optional.map(o => <label key={o.key} className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={optional.includes(o.key)} onChange={e => setOptional(v => e.target.checked ? [...v, o.key] : v.filter(k => k !== o.key))} /><span>{o.description} · £{o.gross} including VAT</span></label>)}{!props.optional.length && <p className="mt-3 text-sm">No optional lines in this revision.</p>}<p className="mt-5 text-xl font-bold">Accepted total: £{gross.slice(0, -2)}.{gross.slice(-2)} including VAT</p></section>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="confirmed" required className="mt-1" /><span>I have checked the written acceptance, this exact revision and the selected optional work. The scope and prices are ready to become the project baseline.</span></label>
      <button disabled={busy} className="rounded-xl bg-neutral-950 px-6 py-3 font-bold text-white disabled:opacity-40">{busy ? "Creating project…" : "Record acceptance and create project"}</button>
    </fieldset>{message && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">{message}</p>}
  </form>;
}
