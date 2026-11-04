"use client";
import { useState } from "react";
import type { Lookups } from "@/app/lib/catalogue/queries";
import { humanize, LookupKind } from "@/app/lib/catalogue/validation";
import { addRate, changeLookupStatus, saveLookup } from "@/app/dashboard/items/actions";
import { ActionForm, control, DateField, DateText, Field, Money, Panel, Select } from "./Forms";

export function SetupManager({ data, kind, initialSelected = "" }: { data: Lookups; kind: LookupKind; initialSelected?: string }) {
  const [selected, setSelected] = useState(initialSelected);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const rows = kind === "category" ? data.categories : kind === "unit" ? data.units : kind === "labour" ? data.labour : kind === "supplier" ? data.suppliers : data.tax;
  const row = rows.find(r => r.id === selected);
  const name = row ? "name" in row ? row.name : row.label : "";
  const extras = (key: string) => row && key in row ? String((row as unknown as Record<string, unknown>)[key] ?? "") : "";
  const title = kind === "category" ? "Categories & subcategories" : kind === "unit" ? "Measurement units" : kind === "labour" ? "Labour roles & rates" : kind === "supplier" ? "Suppliers" : "VAT codes & rates";
  return <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
    <Panel title={title} hint="Entries can be archived and restored. No records are deleted.">
      <label className="block text-sm font-medium">Search entries<input type="search" className={control} value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label className="my-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />Include archived entries</label>
      <button type="button" onClick={() => setSelected("")} className="mb-3 text-sm font-semibold underline">+ Add new {kind === "tax" ? "VAT code" : kind === "labour" ? "labour role" : kind}</button>
      <ul className="max-h-[38rem] overflow-y-auto divide-y">{rows.filter(r => (showArchived || !r.archivedAt) && `${r.code} ${"name" in r ? r.name : r.label}`.toLowerCase().includes(search.toLowerCase())).map(r => <li key={r.id}><button type="button" onClick={() => setSelected(r.id)} className={`w-full rounded-lg px-3 py-3 text-left text-sm ${selected === r.id ? "bg-amber-50 ring-1 ring-inset ring-amber-300" : "hover:bg-neutral-50"}`}><strong>{"name" in r ? r.name : r.label}</strong><span className="mt-1 block text-xs text-neutral-500">{r.code}{r.archivedAt ? " · Archived" : ""}</span></button></li>)}</ul>
      {rows.length === 0 && <p className="py-5 text-sm text-neutral-500">No entries yet. Add the first one using the form.</p>}
    </Panel>
    <div className="space-y-6" key={selected}>
      {!row?.archivedAt && <Panel title={row ? `Edit ${name}` : "Add an entry"} hint={kind === "unit" ? "Use separate units for each, metre, m², m³, room, hour, day or job. A unit’s measurement basis cannot be changed after creation." : kind === "category" ? "Leave parent category blank for a main category. Choose a parent to create a subcategory." : undefined}>
        <ActionForm action={saveLookup}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={selected} /><input type="hidden" name="revision" value={row?.revision ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2"><Field name="code" label="Unique code" required value={row?.code} maxLength={60} /><Field name="name" label="Name" required value={name} maxLength={160} /></div>
          {kind === "category" && <Select name="parentId" label="Parent category" value={extras("parentId")} empty="None — main category" options={data.categories.filter(c => !c.archivedAt && c.id !== selected).map(c => ({ id: c.id, name: c.name }))} />}
          {kind === "unit" && <><Select name="dimensionKind" label="Measurement basis" value={extras("dimensionKind") || "COUNT"} options={["COUNT", "LENGTH", "AREA", "VOLUME", "TIME", "MASS", "CUSTOM"].map(id => ({ id, name: humanize(id) }))} /><div className="grid gap-4 sm:grid-cols-2"><Field name="canonicalFactor" label="Conversion factor (optional)" value={extras("canonicalFactor")} hint="For length/area/volume, convert to metres/m²/m³. Leave blank for item-specific packs." /><Field name="quantityScale" label="Decimal places for quantities" type="number" required value={extras("quantityScale") || "3"} /></div></>}
          {kind === "supplier" && <><div className="grid gap-4 sm:grid-cols-2"><Field name="email" label="Email (optional)" value={extras("email")} type="email" /><Field name="phone" label="Phone (optional)" value={extras("phone")} /></div><Field name="website" label="Website (optional)" value={extras("website")} type="url" /></>}
        </ActionForm>
      </Panel>}
      {row && <Panel title="Entry availability"><ActionForm action={changeLookupStatus} label={row.archivedAt ? "Restore entry" : "Archive entry"} confirm={row.archivedAt ? undefined : `Archive ${name}? Existing references and history will remain.`}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="revision" value={row.revision} /><input type="hidden" name="archive" value={String(!row.archivedAt)} /></ActionForm></Panel>}
      {row && (kind === "tax" || kind === "labour") && <>
        {!row.archivedAt && <Panel title={kind === "tax" ? "Add VAT rate" : "Add labour rate"} hint="A new rate keeps all previous values. Confirm your company’s applicable rates before using them in customer documents.">
          <ActionForm action={addRate} label="Save rate version"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="revision" value={row.revision} />
            {kind === "tax" ? <Field name="rate" label="VAT rate (%)" required /> : <><div className="grid gap-4 sm:grid-cols-2"><Field name="hourlyCost" label="Hourly cost (£)" required /><Field name="dailyCost" label="Daily cost (£, optional)" /></div><div className="grid gap-4 sm:grid-cols-2"><Field name="productiveHoursPerDay" label="Productive hours per day" required value="8" /><Field name="defaultTeamSize" label="Default team size" required value="1" type="number" /></div></>}
            <DateField /><Field name="source" label="Source / reason for the rate" required maxLength={500} />
          </ActionForm>
        </Panel>}
        <Panel title="Rate history" hint="Latest 30 rate versions, including any scheduled changes.">{kind === "tax" ? data.tax.find(t => t.id === row.id)?.rates.map(r => <p key={r.id} className="border-b py-3 text-sm"><strong>{r.rate}%</strong> · <DateText value={r.effectiveFrom} /><span className="mt-1 block text-neutral-500">{r.reason}</span></p>) : data.labour.find(l => l.id === row.id)?.rates.map(r => <p key={r.id} className="border-b py-3 text-sm"><strong><Money value={r.hourlyCost} /> / hour</strong>{r.dailyCost !== null && <> · <Money value={r.dailyCost} /> / day</>}<span className="mt-1 block text-neutral-500"><DateText value={r.effectiveFrom} /> · {r.productiveHoursPerDay} hours/day · {r.source}</span></p>)}</Panel>
      </>}
    </div>
  </div>;
}
