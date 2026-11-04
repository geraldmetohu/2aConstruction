"use client";
import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/lib/catalogue/validation";

export const control = "mt-1 block min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-neutral-100";
export const primary = "inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-950 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-50";
export const secondary = "inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50";
export function ActionForm({ action, children, label = "Save", toItem = false, className = "", confirm }: {
  action: (form: FormData) => Promise<ActionResult>; children: ReactNode; label?: string; toItem?: boolean; className?: string; confirm?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (confirm && !window.confirm(confirm))) return;
    const form = new FormData(event.currentTarget);
    // All date fields explicitly display UTC, avoiding machine-timezone assumptions.
    for (const input of event.currentTarget.querySelectorAll<HTMLInputElement>("input[data-utc]")) {
      if (input.value) form.set(input.name, new Date(`${input.value}Z`).toISOString());
    }
    setBusy(true); setError("");
    try {
      const result = await action(form);
      if (!result.ok) { setError(result.message); return; }
      const url = new URL(window.location.href);
      if (toItem && result.id) { url.pathname = `/dashboard/items/${result.id}`; url.search = ""; }
      if (url.pathname === "/dashboard/items/setup" && result.id) url.searchParams.set("entry", result.id);
      url.searchParams.set("saved", "1");
      router.replace(url.pathname + url.search);
      router.refresh();
    } catch { setError("The save could not be confirmed. Reload to check the latest record before trying again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className={className}>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      {children}
      <div className="flex flex-wrap items-center gap-3"><button type="submit" className={primary} disabled={busy}>{busy ? "Saving…" : label}</button>{busy && <span role="status" className="text-sm text-neutral-600">Please wait</span>}</div>
    </fieldset>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </form>;
}
export function Field({ name, label, value = "", required = false, type = "text", step, hint, maxLength = 4000 }: { name: string; label: string; value?: string | number | null; required?: boolean; type?: string; step?: string; hint?: string; maxLength?: number }) {
  return <label className="block text-sm font-medium">{label}<input className={control} name={name} type={type} defaultValue={value ?? ""} required={required} step={step} min={type === "number" ? "0" : undefined} maxLength={maxLength} />{hint && <span className="mt-1 block text-xs font-normal text-neutral-500">{hint}</span>}</label>;
}
export function Select({ name, label, value = "", options, required = false, empty }: { name: string; label: string; value?: string; options: { id: string; name: string }[]; required?: boolean; empty?: string }) {
  return <label className="block text-sm font-medium">{label}<select className={control} name={name} defaultValue={value} required={required}>
    {empty !== undefined && <option value="">{empty}</option>}{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
  </select></label>;
}
export function TextArea({ name, label, value = "", hint }: { name: string; label: string; value?: string | null; hint?: string }) {
  return <label className="block text-sm font-medium">{label}<textarea className={control} name={name} defaultValue={value ?? ""} rows={3} maxLength={4000} />{hint && <span className="mt-1 block text-xs font-normal text-neutral-500">{hint}</span>}</label>;
}
export function DateField({ name = "effectiveFrom", label = "Effective from (UTC)", required = true }: { name?: string; label?: string; required?: boolean }) {
  return <label className="block text-sm font-medium">{label}<input className={control} name={name} type="datetime-local" step="1" data-utc="true" defaultValue={required ? new Date().toISOString().slice(0, 19) : ""} required={required} /></label>;
}
export function RefFields({ id, revision }: { id: string; revision: number }) { return <><input type="hidden" name="itemId" value={id} /><input type="hidden" name="revision" value={revision} /></>; }
export function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7"><h2 className="text-lg font-bold">{title}</h2>{hint && <p className="mt-1 text-sm leading-6 text-neutral-600">{hint}</p>}<div className="mt-5">{children}</div></section>;
}
export function Money({ value }: { value: string | null | undefined }) { return <>{value == null ? "Not set" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 4 }).format(Number(value))}</>; }
export function DateText({ value }: { value: string }) { return <>{new Date(value).toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC</>; }
