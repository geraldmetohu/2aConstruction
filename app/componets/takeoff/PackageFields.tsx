"use client";
import { useEffect, useState } from "react";
import { fieldVisible, readValues, type Field, type FieldValue, type PackageSpec, type Values } from "@/app/lib/takeoff/package";

/** Renders a work package form from its field descriptors. */
export function PackageFields({ pkg, values, onChange, publicOnly = false, inputClass, labelClass = "block text-xs font-semibold text-neutral-700", context, showClientChoice = false }: {
  pkg: Pick<PackageSpec, "fields" | "defaults">; values: Record<string, FieldValue> | undefined; onChange: (v: Values) => void;
  publicOnly?: boolean; inputClass: string; labelClass?: string;
  /** Extra values for show/hide conditions, e.g. { roomType: "KITCHEN" }. */
  context?: Values;
  /** Mark fields the client will choose later. */
  showClientChoice?: boolean;
}) {
  const v: Values = { ...pkg.defaults, ...readValues(pkg, values ?? {}) };
  const fields = pkg.fields.filter(f => (!publicOnly || f.public) && fieldVisible(f, { ...v, ...context }));
  const groups = [...new Set(fields.map(f => f.group ?? ""))];
  const set = (k: string, x: FieldValue) => onChange({ ...readValues(pkg, values ?? {}), [k]: x });
  return (
    <div className="space-y-4">
      {groups.map(group => {
        const list = fields.filter(f => (f.group ?? "") === group);
        const checks = list.filter(f => f.type === "boolean"), inputs = list.filter(f => f.type !== "boolean");
        return (
          <div key={group} className={group && !publicOnly ? "space-y-2 rounded-lg border border-neutral-200 p-3" : "space-y-2"}>
            {group && !publicOnly && <p className="-mx-3 -mt-3 mb-1 flex items-center gap-2 rounded-t-lg border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#0d3b72]"><span aria-hidden className="h-3.5 w-1 rounded-full bg-amber-500" />{group}</p>}
            {inputs.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{inputs.map(f => <Input key={f.key} f={f} value={v[f.key]} onChange={x => set(f.key, x)} inputClass={inputClass} labelClass={labelClass} clientChoice={showClientChoice && f.clientChoice} />)}</div>}
            {checks.length > 0 && <div className="grid gap-x-4 sm:grid-cols-2">{checks.map(f =>
              <label key={f.key} className="flex items-start gap-2 py-1 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-amber-600" checked={v[f.key] === true} onChange={e => set(f.key, e.target.checked)} />{f.label}</label>)}</div>}
          </div>
        );
      })}
    </div>
  );
}

function Input({ f, value, onChange, inputClass, labelClass, clientChoice }: { f: Field; value: FieldValue; onChange: (v: FieldValue) => void; inputClass: string; labelClass: string; clientChoice?: boolean }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(String(value)); }, [value, focused]);
  const label = `${f.label}${f.unit ? ` (${f.unit})` : ""}`;
  if (f.type === "select") return (
    <label className={labelClass}>{label}{clientChoice && <span title="Priced with this option now; the client chooses in their portal" className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">client chooses</span>}
      <select className={inputClass} value={String(value)} onChange={e => onChange(e.target.value)}>{f.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      {f.hint && <span className="mt-0.5 block font-normal text-neutral-500">{f.hint}</span>}
    </label>
  );
  if (f.type === "text") return (
    <label className={labelClass}>{label}{clientChoice && <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">client chooses</span>}
      <input className={inputClass} value={String(value)} maxLength={60} placeholder={clientChoice ? "Client will choose" : ""} onChange={e => onChange(e.target.value)} />
    </label>
  );
  return (
    <label className={labelClass}>{label}
      <input className={inputClass} inputMode={f.type === "int" ? "numeric" : "decimal"} value={text}
        onChange={e => { setText(e.target.value); const n = Number(e.target.value); if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(f.type === "int" ? Math.round(n) : n); }}
        onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setText(String(value)); }} />
      {f.hint && <span className="mt-0.5 block font-normal text-neutral-500">{f.hint}</span>}
    </label>
  );
}
