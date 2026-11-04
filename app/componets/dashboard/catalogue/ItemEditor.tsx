"use client";
import { useState } from "react";
import Link from "next/link";
import type { CatalogueItem, Lookups } from "@/app/lib/catalogue/queries";
import { conditions, dimensions, fixStages, humanize, itemRoles, itemTypes } from "@/app/lib/catalogue/validation";
import * as actions from "@/app/dashboard/items/actions";
import { ActionForm, control, DateField, DateText, Field, Money, Panel, RefFields, secondary, Select, TextArea } from "./Forms";

const choices = (values: readonly string[]) => values.map(id => ({ id, name: humanize(id) }));
const yesNo = [{ id: "true", name: "Yes" }, { id: "false", name: "No" }];
function available<T extends { id: string; archivedAt: string | null }>(rows: T[], selected?: string) { return rows.filter(r => !r.archivedAt || r.id === selected); }
function dimensionValues(item?: CatalogueItem | null) { return item?.defaultDimensions && typeof item.defaultDimensions === "object" && !Array.isArray(item.defaultDimensions) ? item.defaultDimensions : {}; }

export function ItemDetailsForm({ item, lookups }: { item?: CatalogueItem | null; lookups: Lookups }) {
  const dims = dimensionValues(item);
  if (item?.archivedAt) return <Panel title="Archived item" hint="Its details and history are retained. Restore it from Availability to make changes."><p className="text-sm">{item.description || "No description recorded."}</p></Panel>;
  if (!lookups.categories.some(c => !c.archivedAt) || !lookups.units.some(u => !u.archivedAt)) return <Panel title="Start with a category and a unit"><p className="text-sm leading-6">Add a category such as Doors and a unit such as Each in <Link href="/dashboard/items/setup" className="font-semibold underline">Catalogue setup</Link>, then create your first item.</p></Panel>;
  return <Panel title={item ? "Item details" : "New construction item"} hint="Keep the description clear enough to reuse in an estimate. Prices and work specifications are added after saving.">
    <ActionForm action={actions.saveItem} toItem={!item}>
      <input type="hidden" name="id" value={item?.id ?? ""} /><input type="hidden" name="revision" value={item?.revision ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2"><Field name="code" label="Item code" value={item?.code} required maxLength={60} /><Field name="name" label="Item name" value={item?.name} required maxLength={160} /></div>
      <TextArea name="description" label="Description" value={item?.description} />
      <div className="grid gap-4 sm:grid-cols-2"><Select name="categoryId" label="Category / subcategory" value={item?.categoryId} required empty="Choose a category" options={available(lookups.categories, item?.categoryId).map(c => ({ id: c.id, name: `${c.parentId ? `${lookups.categories.find(p => p.id === c.parentId)?.name} / ` : ""}${c.name}${c.archivedAt ? " (archived — choose another)" : ""}` }))} /><Select name="unitId" label="Priced per" value={item?.unitId} required empty="Choose a unit" options={available(lookups.units, item?.unitId).map(u => ({ id: u.id, name: `${u.label}${u.archivedAt ? " (archived — choose another)" : ""}` }))} /></div>
      <div className="grid gap-4 sm:grid-cols-3"><Select name="itemType" label="Item type" value={item?.itemType ?? "MATERIAL"} options={choices(itemTypes)} /><Select name="itemRole" label="Main or supporting item" value={item?.itemRole ?? "MAIN"} options={choices(itemRoles)} /><Select name="fixStage" label="Fix stage" value={item?.fixStage ?? "NOT_APPLICABLE"} options={choices(fixStages)} /></div>
      <div className="grid gap-4 sm:grid-cols-3"><Field name="defaultQuantity" label="Default quantity" value={item?.defaultQuantity ?? "1"} required /><Field name="defaultDurationHours" label="Typical duration (hours)" value={item?.defaultDurationHours} /><Select name="active" label="Available for new estimates" value={String(item?.active ?? true)} options={yesNo} /></div>
      <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">Optional dimensions</summary><p className="my-3 text-xs text-neutral-500">Lengths in metres, area in m² and volume in m³.</p><div className="grid gap-4 sm:grid-cols-4">{dimensions.map(name => <Field key={name} name={name} label={humanize(name)} value={typeof dims[name] === "string" ? dims[name] as string : ""} />)}</div></details>
    </ActionForm>
  </Panel>;
}

export function PricePanel({ item, lookups }: { item: CatalogueItem; lookups: Lookups }) {
  const current = item.currentPrice;
  return <div className="space-y-6">{!item.archivedAt && <Panel title="Add a price version" hint="Enter internal unit costs, excluding VAT. Every save keeps all previous prices. These are costs, not a customer selling price.">
    <ActionForm action={actions.addPrice} label="Save new price version"><RefFields id={item.id} revision={item.revision} />
      <div className="grid gap-4 sm:grid-cols-2"><Field name="materialUnitCost" label="Material cost (£ / unit)" value={current?.materialUnitCost ?? "0"} required /><Field name="labourUnitCost" label="Labour cost override (£ / unit)" value={current?.labourUnitCost} hint="Leave blank to use labour hours and rates. Enter 0 for no labour charge." /></div>
      <div className="grid gap-4 sm:grid-cols-3"><Field name="plantUnitCost" label="Plant / equipment (£)" value={current?.plantUnitCost ?? "0"} required /><Field name="wasteUnitCost" label="Waste (£)" value={current?.wasteUnitCost ?? "0"} required /><Field name="otherUnitCost" label="Other costs (£)" value={current?.otherUnitCost ?? "0"} required /></div>
      <div className="grid gap-4 sm:grid-cols-2"><Select name="taxCodeId" label="VAT treatment" value={current?.taxCodeId ?? ""} empty="Not yet assigned" options={lookups.tax.filter(t => !t.archivedAt && t.active).map(t => ({ id: t.id, name: t.label }))} /><DateField /></div>
      <div className="grid gap-4 sm:grid-cols-3"><Field name="source" label="Price source / reason" required value={current?.source} maxLength={500} /><DateField name="sourceDate" label="Source checked (UTC, optional)" required={false} /><Select name="confidence" label="Price confidence" value="UNVERIFIED" options={choices(["UNVERIFIED", "INDICATIVE", "VERIFIED"])} /></div>
      <TextArea name="notes" label="Internal price notes" />
    </ActionForm>
  </Panel>}
  <Panel title="Price history" hint="Latest 50 versions, ordered by effective date. Future-dated prices are marked as scheduled.">
    {item.prices.length === 0 ? <p className="text-sm text-neutral-500">No price has been entered.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-neutral-500"><tr>{["Version / effective", "Material", "Labour", "Other costs", "Source / VAT"].map(t => <th className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{item.prices.map(p => <tr className="border-b align-top" key={p.id}><td className="p-3"><strong>v{p.versionNumber}</strong><div className="mt-1 text-xs"><DateText value={p.effectiveFrom} /></div>{new Date(p.effectiveFrom) > new Date() && <span className="text-xs text-amber-700">Scheduled</span>}</td><td className="p-3"><Money value={p.materialUnitCost} /></td><td className="p-3">{p.labourUnitCost === null ? "From labour specification" : <Money value={p.labourUnitCost} />}</td><td className="p-3 text-xs">Plant <Money value={p.plantUnitCost} /><br />Waste <Money value={p.wasteUnitCost} /><br />Other <Money value={p.otherUnitCost} /></td><td className="max-w-xs p-3">{p.source}<div className="text-xs text-neutral-500">{humanize(p.confidence)} · {p.taxCode?.label ?? "VAT unassigned"}</div>{p.notes && <p className="mt-1 whitespace-pre-wrap text-xs">{p.notes}</p>}</td></tr>)}</tbody></table></div>}
  </Panel></div>;
}

type SupportRow = { itemId: string; quantity: string; mandatory: boolean; defaultSelected: boolean };
type LabourRow = { roleId: string; hours: string; teamSize: number; rateBasis: "HOURLY" | "DAILY" };
export function RecipePanel({ item, lookups }: { item: CatalogueItem; lookups: Lookups }) {
  const [condition, setCondition] = useState<typeof conditions[number]>("NEW_INSTALLATION");
  const current = item.currentRecipes.find(r => r.condition === condition);
  return <div className="space-y-6"><label className="block max-w-sm text-sm font-semibold">Work condition<select className={control} value={condition} onChange={e => setCondition(e.target.value as typeof conditions[number])}>{conditions.map(c => <option key={c} value={c}>{humanize(c)}</option>)}</select></label>
    {!item.archivedAt && <RecipeForm key={`${condition}-${current?.id ?? "new"}`} item={item} lookups={lookups} condition={condition} current={current} />}
    <Panel title="Published specifications" hint="Each version keeps its own supporting items, hours and assumptions. Latest 60 versions across all work conditions.">{item.recipes.filter(r => r.condition === condition).length === 0 ? <p className="text-sm text-neutral-500">No published specification for this condition.</p> : item.recipes.filter(r => r.condition === condition).map(r => <details className="border-b py-4" key={r.id}><summary className="cursor-pointer text-sm font-semibold">Version {r.versionNumber} · <DateText value={r.effectiveFrom} /></summary><ul className="mt-3 space-y-2 text-sm">{r.supportingItems.map(s => <li key={s.id}>{s.supportingItem.name} · {quantityFrom(s.quantityRule)} per unit · {s.mandatory ? "Required" : s.defaultSelected ? "Included by default" : "Optional"}</li>)}{r.labour.map(l => <li key={l.id}>{l.labourRole.name} · {l.hoursPerUnit} person-hours / unit · team of {l.teamSize} · {humanize(l.rateBasis)}</li>)}</ul><p className="mt-3 whitespace-pre-wrap text-sm text-neutral-600">{Array.isArray(r.assumptions) ? r.assumptions.join("\n") : ""}</p></details>)}</Panel>
  </div>;
}
function quantityFrom(value: unknown) { return value && typeof value === "object" && "value" in value ? String(value.value) : "1"; }
function RecipeForm({ item, lookups, condition, current }: { item: CatalogueItem; lookups: Lookups; condition: typeof conditions[number]; current?: CatalogueItem["recipes"][number] }) {
  const [support, setSupport] = useState<SupportRow[]>(current?.supportingItems.map(s => ({ itemId: s.supportingItemId, quantity: quantityFrom(s.quantityRule), mandatory: s.mandatory, defaultSelected: s.defaultSelected })) ?? []);
  const [labour, setLabour] = useState<LabourRow[]>(current?.labour.map(l => ({ roleId: l.labourRoleId, hours: l.hoursPerUnit, teamSize: l.teamSize, rateBasis: l.rateBasis })) ?? []);
  function editSupport(index: number, patch: Partial<SupportRow>) { setSupport(rows => rows.map((r, i) => i === index ? { ...r, ...patch } : r)); }
  function editLabour(index: number, patch: Partial<LabourRow>) { setLabour(rows => rows.map((r, i) => i === index ? { ...r, ...patch } : r)); }
  return <Panel title={`Work specification · ${humanize(condition)}`} hint="Quantities and person-hours are per unit of this item. Save publishes a new version; removing a row here only changes the new version.">
    <ActionForm action={actions.publishRecipe} label="Publish new specification"><RefFields id={item.id} revision={item.revision} /><input type="hidden" name="condition" value={condition} /><input type="hidden" name="supporting" value={JSON.stringify(support)} /><input type="hidden" name="labour" value={JSON.stringify(labour)} />
      <div className="space-y-3"><h3 className="font-semibold">Supporting materials / items</h3>{support.map((s, index) => <div key={index} className="grid gap-3 rounded-xl border bg-neutral-50 p-4 sm:grid-cols-2">
        <label className="text-sm">Supporting item<input className={control} list="supporting-catalogue" aria-label={`Supporting item ${index + 1}`} value={lookups.items.find(i => i.id === s.itemId)?.code ?? s.itemId} onChange={e => editSupport(index, { itemId: lookups.items.find(i => i.code === e.target.value)?.id ?? e.target.value })} required placeholder="Type an item code" /></label>
        <label className="text-sm">Quantity per unit<input className={control} value={s.quantity} onChange={e => editSupport(index, { quantity: e.target.value })} required inputMode="decimal" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.mandatory} onChange={e => editSupport(index, { mandatory: e.target.checked, defaultSelected: e.target.checked || s.defaultSelected })} />Required</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.defaultSelected} disabled={s.mandatory} onChange={e => editSupport(index, { defaultSelected: e.target.checked })} />Included by default</label>
        <button className="text-left text-sm font-medium underline" type="button" onClick={() => setSupport(rows => rows.filter((_, i) => i !== index))}>Remove from new version</button>
      </div>)}<datalist id="supporting-catalogue">{lookups.items.filter(i => i.id !== item.id && !i.archivedAt && i.active).map(i => <option key={i.id} value={i.code}>{i.name}</option>)}</datalist><button className={secondary} type="button" disabled={support.length >= 50} onClick={() => setSupport(rows => [...rows, { itemId: "", quantity: "1", mandatory: false, defaultSelected: true }])}>+ Supporting item</button></div>
      <div className="space-y-3"><h3 className="font-semibold">Labour</h3>{labour.map((l, index) => <div key={index} className="grid gap-3 rounded-xl border bg-neutral-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Role<select className={control} value={l.roleId} onChange={e => editLabour(index, { roleId: e.target.value })} required><option value="">Choose role</option>{available(lookups.labour, l.roleId).map(r => <option key={r.id} value={r.id}>{r.name}{r.archivedAt ? " (archived)" : ""}</option>)}</select></label>
        <label className="text-sm">Person-hours / unit<input className={control} required value={l.hours} onChange={e => editLabour(index, { hours: e.target.value })} inputMode="decimal" /></label>
        <label className="text-sm">Team size<input className={control} type="number" min="1" max="1000" required value={l.teamSize} onChange={e => editLabour(index, { teamSize: Number(e.target.value) })} /></label>
        <label className="text-sm">Rate basis<select className={control} value={l.rateBasis} onChange={e => editLabour(index, { rateBasis: e.target.value as LabourRow["rateBasis"] })}><option value="HOURLY">Hourly</option><option value="DAILY">Daily</option></select></label>
        <button type="button" className="text-left text-sm font-medium underline sm:col-span-2" onClick={() => setLabour(rows => rows.filter((_, i) => i !== index))}>Remove from new version</button>
      </div>)}<button className={secondary} type="button" disabled={labour.length >= 30} onClick={() => setLabour(rows => [...rows, { roleId: "", hours: "1", teamSize: 1, rateBasis: "HOURLY" }])}>+ Labour role</button></div>
      <TextArea name="assumptions" label="Assumptions (one per line)" value={current && Array.isArray(current.assumptions) ? current.assumptions.join("\n") : ""} />
    </ActionForm>
  </Panel>;
}

export function OptionsPanel({ item }: { item: CatalogueItem }) {
  const [selected, setSelected] = useState("");
  const option = item.options.find(o => o.id === selected);
  const version = option?.versions[0];
  const rule = version?.rule && typeof version.rule === "object" && !Array.isArray(version.rule) ? version.rule : {};
  const spec = version?.specification && typeof version.specification === "object" && !Array.isArray(version.specification) ? version.specification : {};
  return <div className="space-y-6">{!item.archivedAt && <Panel title="Standard and upgrade options" hint="Group choices by finish, style or specification. Adjustments are additional internal costs per unit, before VAT.">
    <label className="mb-5 block text-sm font-medium">Edit an option or add one<select className={control} value={selected} onChange={e => setSelected(e.target.value)}><option value="">New option</option>{item.options.map(o => <option key={o.id} value={o.id}>{o.groupCode} / {o.label}</option>)}</select></label>
    <ActionForm key={selected} action={actions.saveOption} label="Save option version"><RefFields id={item.id} revision={item.revision} /><input type="hidden" name="optionId" value={selected} />
      <div className="grid gap-4 sm:grid-cols-3"><Field name="groupCode" label="Group code (e.g. finish)" value={option?.groupCode} required /><Field name="code" label="Option code (e.g. premium)" value={option?.code} required /><Field name="label" label="Customer-friendly name" value={option?.label} required /></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field name="materialDelta" label="Additional material cost (£)" value={String(rule.materialDelta ?? "0")} required /><Field name="labourDelta" label="Additional labour cost (£)" value={String(rule.labourDelta ?? "0")} required /></div>
      <TextArea name="specification" label="Specification" value={String(spec.description ?? "")} />
    </ActionForm>
  </Panel>}
  <Panel title="Saved options">{item.options.length === 0 ? <p className="text-sm text-neutral-500">No options yet.</p> : item.options.map(o => <details className="border-b py-4" key={o.id}><summary className="cursor-pointer font-semibold">{o.groupCode} / {o.label} <span className="text-xs font-normal text-neutral-500">{o.active ? "Available" : "Inactive"}</span></summary><div className="mt-4 space-y-3">{!item.archivedAt && <ActionForm action={actions.changeOptionStatus} label={o.active ? "Make inactive" : "Make available"}><RefFields id={item.id} revision={item.revision} /><input type="hidden" name="optionId" value={o.id} /><input type="hidden" name="active" value={String(!o.active)} /></ActionForm>}{o.versions.map(ver => <p key={ver.id} className="text-sm">Version {ver.versionNumber} · <DateText value={ver.effectiveFrom} /> · {ver.specification && typeof ver.specification === "object" && "description" in ver.specification ? String(ver.specification.description) : ""}</p>)}</div></details>)}</Panel></div>;
}

export function SupplierPanel({ item, lookups }: { item: CatalogueItem; lookups: Lookups }) {
  return <div className="space-y-6">{!item.archivedAt && <Panel title="Record a supplier price" hint="References help you review prices. Recording one does not change your standard item price."><ActionForm action={actions.addSupplierReference} label="Record price reference"><RefFields id={item.id} revision={item.revision} />
    <div className="grid gap-4 sm:grid-cols-2"><Select name="supplierId" label="Supplier" required empty="Choose supplier" options={available(lookups.suppliers).map(s => ({ id: s.id, name: s.name }))} /><Field name="supplierCode" label="Supplier product code" /></div>
    <div className="grid gap-4 sm:grid-cols-3"><Field name="referencePrice" label="Reference price (£)" required /><Select name="unitId" label="Price unit" value={item.unitId} required options={available(lookups.units).map(u => ({ id: u.id, name: u.label }))} /><Field name="packQuantity" label="Pack quantity (optional)" /></div>
    <div className="grid gap-4 sm:grid-cols-2"><Select name="taxInclusive" label="Does the reference include VAT?" value="true" options={yesNo} /><DateField name="checkedAt" label="Checked at (UTC)" /></div>
    <Field name="sourceUrl" label="Product web address (optional)" type="url" /><TextArea name="notes" label="Reference notes" />
  </ActionForm></Panel>}
  <Panel title="Supplier reference history" hint="Latest 50 observations. Previous observations are kept.">{item.supplierPrices.length === 0 ? <p className="text-sm text-neutral-500">No supplier references recorded.</p> : <div className="space-y-4">{item.supplierPrices.map(p => <article className="border-b pb-4 text-sm" key={p.id}><p className="font-semibold">{p.supplier.name} · <Money value={p.referencePrice} /> / {p.unit.label} · {p.taxInclusive ? "includes VAT" : "excludes VAT"}</p><p className="mt-1 text-neutral-500"><DateText value={p.checkedAt} />{p.supplierCode ? ` · ${p.supplierCode}` : ""}{p.packQuantity ? ` · pack of ${p.packQuantity}` : ""}</p>{p.sourceUrl && /^https?:\/\//i.test(p.sourceUrl) && <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline">Supplier product page</a>}{p.notes && <p className="mt-2 whitespace-pre-wrap">{p.notes}</p>}</article>)}</div>}</Panel></div>;
}

export function AvailabilityPanel({ item }: { item: CatalogueItem }) {
  return <div className="grid gap-6 lg:grid-cols-2"><Panel title="Availability" hint={item.archivedAt ? "Restoring keeps the item inactive until you review and activate it." : "Archive keeps the item and its entire history, while removing it from new selections."}>
    <div className="space-y-5"><ActionForm action={actions.changeItemStatus} label={item.archivedAt ? "Restore item" : "Archive item"} confirm={item.archivedAt ? undefined : `Archive ${item.name}? Its records will be retained.`}><RefFields id={item.id} revision={item.revision} /><input type="hidden" name="state" value={item.archivedAt ? "restore" : "archive"} /></ActionForm>{!item.archivedAt && <ActionForm action={actions.changeItemStatus} label={item.active ? "Make inactive" : "Activate item"}><RefFields id={item.id} revision={item.revision} /><input type="hidden" name="state" value={item.active ? "deactivate" : "activate"} /></ActionForm>}</div>
  </Panel><Panel title="Duplicate item" hint="Copies details, the current price, published specifications and active options. The new item starts inactive for review; supplier references remain on the source item."><ActionForm action={actions.duplicateItem} label="Create copy" toItem><RefFields id={item.id} revision={item.revision} /><Field name="code" label="New unique item code" required value={`${item.code}-copy`.slice(0, 60)} /><Field name="name" label="New item name" required value={`${item.name} (copy)`.slice(0, 160)} /></ActionForm></Panel></div>;
}
