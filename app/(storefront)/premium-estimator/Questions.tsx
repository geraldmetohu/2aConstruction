"use client";
import { Draft, measuredWork, newRoom, newWork, projectLabels, Room, uncertainty, Work, workCodes, workLabels } from "@/app/lib/premium/requirements";

export const fieldClass = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";
export type PublicSpecifications = Record<string, { standard: string; upgrade?: string }>;
export function specificationFor(work: Work, specifications: PublicSpecifications) { return specifications[work.code === "roof" ? `roof:${work.roofType}:${work.roofCovering}` : work.code]; }
function Field({ label, value, change, placeholder = "Not sure" }: { label: string; value: string; change: (value: string) => void; placeholder?: string }) {
  return <label className="block text-sm font-semibold">{label}<input className={fieldClass} value={value} onChange={e => change(e.target.value)} placeholder={placeholder} maxLength={100} /></label>;
}
function Select({ label, value, change, options }: { label: string; value: string; change: (value: string) => void; options: readonly (readonly [string, string])[] }) {
  return <label className="block text-sm font-semibold">{label}<select className={fieldClass} value={value} onChange={e => change(e.target.value)}>{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>;
}
export function PropertyQuestions({ draft, change }: { draft: Draft; change: (draft: Draft) => void }) {
  return <div className="space-y-6">
    <fieldset><legend className="mb-3 text-sm font-semibold">Type of project</legend><div className="grid gap-3 sm:grid-cols-3">{Object.entries(projectLabels).map(([key, label]) => <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${draft.project === key ? "border-amber-500 bg-amber-50" : "border-neutral-200"}`}><input type="radio" name="project" checked={draft.project === key} onChange={() => change({ ...draft, project: key as Draft["project"] })} className="accent-amber-600" /><span className="font-bold">{label}</span></label>)}</div></fieldset>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Project postcode" value={draft.postcode} change={postcode => change({ ...draft, postcode })} placeholder="e.g. SW1A 1AA" />
      <Select label="Property type" value={draft.property.type} change={type => change({ ...draft, property: { ...draft.property, type: type as Draft["property"]["type"] } })} options={[["house", "House"], ["flat", "Flat"], ["commercial", "Commercial"], ["other", "Other"], ["unsure", "Not sure"]]} />
      {([["floors", "Number of floors"], ["area", "Approximate property area (m²)"], ["bedrooms", "Number of bedrooms"], ["bathrooms", "Number of bathrooms"]] as const).map(([key, label]) => <Field key={key} label={label} value={draft.property[key]} change={value => change({ ...draft, property: { ...draft.property, [key]: value } })} />)}
    </div>
    <p className="text-sm leading-6 text-neutral-500">Property details provide context. Only the work you select in the next steps is included in your scope. Add specialist work or anything unusual as a special request for individual review.</p>
  </div>;
}
export function RoomQuestions({ draft, change }: { draft: Draft; change: (draft: Draft) => void }) {
  const update = (index: number, room: Room) => change({ ...draft, rooms: draft.rooms.map((r, i) => i === index ? room : r) });
  return <div className="space-y-5">{draft.rooms.map((room, i) => <section key={room.key} className="rounded-2xl border border-neutral-200 p-5">
    <div className="flex items-start justify-between gap-4"><div className="w-full max-w-md"><Field label={`Room or area ${i + 1}`} value={room.name} change={name => update(i, { ...room, name })} placeholder="e.g. Main bedroom, roof or garden" /></div>{draft.rooms.length > 1 && <button type="button" className="mt-8 p-2 text-sm text-red-700" onClick={() => change({ ...draft, rooms: draft.rooms.filter((_, n) => n !== i) })}>Remove<span className="sr-only"> {room.name || `room ${i + 1}`}</span></button>}</div>
    <fieldset className="mt-5"><legend className="mb-3 text-sm font-semibold">What would you like us to work on?</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{workCodes.map(code => <label key={code} className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm"><input type="checkbox" className="accent-amber-600" checked={room.works.some(w => w.code === code)} onChange={e => update(i, { ...room, works: e.target.checked ? [...room.works, newWork(code, draft.project)] : room.works.filter(w => w.code !== code) })} />{workLabels[code]}</label>)}</div></fieldset>
  </section>)}<button type="button" disabled={draft.rooms.length >= 10} className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold disabled:opacity-40" onClick={() => change({ ...draft, rooms: [...draft.rooms, newRoom(crypto.randomUUID())] })}>+ Add another room or area</button></div>;
}
export function WorkQuestions({ draft, change, specifications }: { draft: Draft; change: (draft: Draft) => void; specifications: PublicSpecifications }) {
  const update = (index: number, room: Room) => change({ ...draft, rooms: draft.rooms.map((r, i) => i === index ? room : r) });
  const workUpdate = (index: number, code: Work["code"], patch: Partial<Work>) => update(index, { ...draft.rooms[index], works: draft.rooms[index].works.map(w => w.code === code ? { ...w, ...patch } : w) });
  return <div className="space-y-7"><p className="text-sm leading-6 text-neutral-600">Leave unknown measurements blank or choose “Not sure”. Those parts need review and are excluded from the calculated total.</p>
    {draft.rooms.map((room, i) => <section key={room.key} className="rounded-2xl border border-neutral-200 p-5"><h3 className="text-lg font-black">{room.name}</h3>
      {room.works.some(w => ["flooring", "painting", "plastering"].includes(w.code)) && <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Room length (m)" value={room.length} change={length => update(i, { ...room, length })} /><Field label="Room width (m)" value={room.width} change={width => update(i, { ...room, width })} />
        {room.works.some(w => ["painting", "plastering"].includes(w.code)) && <><Field label="Wall height (m)" value={room.height} change={height => update(i, { ...room, height })} /><Field label="Doors/windows area (m²)" value={room.openings} change={openings => update(i, { ...room, openings })} placeholder="0 if none" /></>}
      </div>}
      {room.works.map(work => <fieldset key={work.code} className="mt-6 border-t border-neutral-100 pt-5"><legend className="px-1 font-bold">{workLabels[work.code]}</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {work.code in measuredWork ? <Field label={measuredWork[work.code as keyof typeof measuredWork]} value={work.measure} change={measure => workUpdate(i, work.code, { measure })} /> : !["flooring", "painting", "plastering"].includes(work.code) && <Field label={work.code === "doors" ? "Number of doors" : work.code === "windows" ? "Number of windows" : work.code === "electrical" ? "Number of points" : "Number of fixtures"} value={work.quantity} change={quantity => workUpdate(i, work.code, { quantity })} />}
          {work.code === "roof" && <>
            <Select label="Roof type" value={work.roofType} change={roofType => workUpdate(i, work.code, { roofType: roofType as Work["roofType"], roofCovering: "unsure" })} options={[["pitched", "Pitched"], ["flat", "Flat"], ["mixed", "Mixed"], ["unsure", "Not sure"]]} />
            {["pitched", "flat"].includes(work.roofType) && <Select label="Roof covering" value={work.roofCovering} change={roofCovering => workUpdate(i, work.code, { roofCovering: roofCovering as Work["roofCovering"] })} options={work.roofType === "pitched" ? [["concrete", "Concrete tiles"], ["clay", "Clay tiles"], ["slate", "Slate"], ["other", "Other"], ["unsure", "Not sure"]] : [["membrane", "Flat roof membrane"], ["other", "Other"], ["unsure", "Not sure"]]} />}
            <Field label="Roof windows (0 if none)" value={work.roofWindows} change={roofWindows => workUpdate(i, work.code, { roofWindows })} />
            <Select label="Roof insulation required?" value={work.roofInsulation} change={roofInsulation => workUpdate(i, work.code, { roofInsulation: roofInsulation as Work["roofInsulation"] })} options={[["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]]} />
            <Select label="Guttering required?" value={work.guttering} change={guttering => workUpdate(i, work.code, { guttering: guttering as Work["guttering"] })} options={[["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]]} />
          </>}
          {([
            ["Specification", "specification", [["standard", "Standard specification"], ["upgrade", "Upgraded specification"], ["unsure", "Not sure"]]],
            ["Who supplies the materials?", "supply", [["contractor", "2A Construction supplies"], ["client", "I will supply them"], ["existing", "Retain existing materials"], ["unsure", "Not sure"]]],
            ["What needs to happen?", "condition", [["new", "New installation"], ["refurbishment", "Refurbish / replace existing"], ["repair", "Repair existing"], ["unsure", "Not sure"]]],
            ["Include in the main estimate?", "inclusion", [["included", "Yes, include this work"], ["optional", "Show as an optional extra"]]],
          ] as const).map(([label, key, options]) => <Select key={key} label={label} value={work[key]} change={value => workUpdate(i, work.code, { [key]: value })} options={options} />)}
        </div>
        {specificationFor(work, specifications) && <p className="mt-3 text-sm text-neutral-600">{work.specification === "upgrade" ? specificationFor(work, specifications)?.upgrade : specificationFor(work, specifications)?.standard}</p>}
        {work.code === "roof" && <p className="mt-3 text-sm text-amber-800">Roof covering is priced separately. Roof windows, roof insulation and guttering are recorded for review and excluded from the covering total.</p>}
        {["painting", "plastering"].includes(work.code) && <p className="mt-3 text-xs text-neutral-500">Walls only. Add ceilings, woodwork and specialist finishes as special requests.</p>}
      </fieldset>)}
    </section>)}
    <label className="block text-sm font-semibold">Anything else we should know?<textarea className={fieldClass} rows={4} maxLength={4000} value={draft.specialRequests} onChange={e => change({ ...draft, specialRequests: e.target.value })} placeholder="Access restrictions, specialist finishes or questions…" /></label>
  </div>;
}
export function ScopeReview({ draft, specifications = {} }: { draft: Draft; specifications?: PublicSpecifications }) {
  return <div className="space-y-5">
    <div className="rounded-2xl bg-neutral-50 p-5"><h3 className="font-bold">{projectLabels[draft.project]} · {draft.postcode}</h3><p className="mt-1 break-words text-sm text-neutral-600">Prepared for {draft.contact.name} · {draft.contact.email}</p>{draft.property && <p className="mt-2 text-sm text-neutral-600">Property: {draft.property.type}; {draft.property.floors || "unconfirmed"} floors; {draft.property.area || "unconfirmed"} m²; {draft.property.bedrooms || "unconfirmed"} bedrooms; {draft.property.bathrooms || "unconfirmed"} bathrooms.</p>}</div>
    {draft.rooms.map(room => <section key={room.key} className="overflow-hidden rounded-2xl border border-neutral-200"><h3 className="bg-neutral-50 px-5 py-3 font-bold">{room.name}</h3><ul className="divide-y divide-neutral-100">{room.works.map(work => {
      const issues = uncertainty(room, work);
      const quantity = work.code === "flooring" ? `${room.length || "?"} × ${room.width || "?"} m floor` : ["painting", "plastering"].includes(work.code) ? `${room.length || "?"} × ${room.width || "?"} m room; ${room.height || "?"} m wall height; ${room.openings || "?"} m² openings` : work.code in measuredWork ? `${measuredWork[work.code as keyof typeof measuredWork]}: ${work.measure || "To confirm"}` : `${work.quantity || "Unconfirmed"} ${work.code === "doors" ? "doors" : work.code === "windows" ? "windows" : work.code === "electrical" ? "points" : "fixtures"}`;
      return <li key={work.code} className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{workLabels[work.code]}</span>{work.inclusion === "optional" && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Optional · priced separately</span>}</div><p className="mt-1 text-sm text-neutral-600">{quantity}</p><p className="mt-1 text-sm text-neutral-600">{work.specification} specification · {work.supply === "contractor" ? "We supply materials" : work.supply === "client" ? "You supply materials" : work.supply === "existing" ? "Retain existing materials" : "Supply to confirm"} · {work.condition}</p>
        {specificationFor(work, specifications) && <p className="mt-2 text-sm text-neutral-600">{work.specification === "upgrade" ? specificationFor(work, specifications)?.upgrade : specificationFor(work, specifications)?.standard}</p>}
        {work.code === "roof" && <p className="mt-2 text-sm text-amber-800">{work.roofType} roof · {work.roofCovering} covering. Roof windows: {work.roofWindows || "not sure"}; insulation: {work.roofInsulation}; guttering: {work.guttering}. Roof accessories need separate review and are excluded from the covering price.</p>}
        {issues.length > 0 && <p className="mt-2 text-sm font-medium text-amber-800">For review — {issues.join("; ")}. This work will not be included in the calculated total until confirmed.</p>}</li>;
    })}</ul></section>)}
    {draft.specialRequests && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-bold">Special requests · for review</h3><p className="mt-2 whitespace-pre-wrap text-sm">{draft.specialRequests}</p><p className="mt-2 text-sm text-amber-900">These requests need an individual assessment and are excluded from the calculated total.</p></div>}
  </div>;
}
