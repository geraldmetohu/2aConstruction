import type { Ctx } from "./engine";

export type FieldValue = number | boolean | string;
export type Values = Record<string, FieldValue>;

/** One input on a work package form. The UI and validation are generated from these. */
export interface Field {
  key: string;
  label: string;
  type: "number" | "int" | "boolean" | "select" | "text";
  default: FieldValue;
  min?: number;
  max?: number;
  unit?: string;
  options?: [string, string][];
  hint?: string;
  /** Shown on the public instant-quote page. */
  public?: boolean;
  /** The client decides this later in their portal; the quote is priced with the default until then. */
  clientChoice?: boolean;
  group?: string;
  /** Only show when every condition holds (plain data so the form spec can be sent to a browser). */
  when?: Cond[];
}

/** One condition; `any` holds when at least one of its conditions holds. */
export interface Cond { key?: string; is?: FieldValue; not?: FieldValue; gt?: number; in?: FieldValue[]; any?: Cond[] }
const holds = (c: Cond, v: Values): boolean => {
  if (c.any) return c.any.some(x => holds(x, v));
  const x = c.key === undefined ? undefined : v[c.key];
  return (c.is === undefined || x === c.is) && (c.not === undefined || x !== c.not) && (c.gt === undefined || Number(x) > c.gt) && (c.in === undefined || (x !== undefined && c.in.includes(x)));
};
export const fieldVisible = (f: Pick<Field, "when">, v: Values) => !f.when || f.when.every(c => holds(c, v));

/** Serializable form description of a package (no formulas, no prices). */
export interface PackageSpec { id: string; label: string; description: string; usesProperty?: boolean; fields: Field[]; defaults: Values }
export const toSpec = (p: Pick<WorkPackage, "id" | "label" | "description" | "usesProperty" | "fields">, onlyPublic = false): PackageSpec => ({
  id: p.id, label: p.label, description: p.description, usesProperty: p.usesProperty,
  fields: onlyPublic ? p.fields.filter(f => f.public) : p.fields,
  defaults: Object.fromEntries(p.fields.map(f => [f.key, f.default])),
});

export interface WorkPackage {
  id: string;
  label: string;
  /** Prefix for programme stages, e.g. "Loft". */
  short: string;
  description: string;
  /** Uses the shared property dimensions (house type, width, length). */
  usesProperty?: boolean;
  fields: Field[];
  needsScaffold?: (v: Values) => boolean;
  /** Suggested skips for this package. */
  skips?: (v: Values) => number;
  build(ctx: Ctx, v: Values): void;
}

/** Validate and fill package values from untrusted input. Unknown keys are dropped. */
export function readValues(pkg: { fields: Field[] }, raw: unknown, onlyPublic = false): Values {
  const src = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const out: Values = {};
  for (const f of pkg.fields) {
    const given = onlyPublic && !f.public ? undefined : src[f.key];
    let v: FieldValue = f.default;
    if (f.type === "boolean") v = typeof given === "boolean" ? given : f.default;
    else if (f.type === "select") v = typeof given === "string" && f.options?.some(([k]) => k === given) ? given : f.default;
    else if (f.type === "text") v = typeof given === "string" ? given.trim().slice(0, 60) : f.default;
    else if (typeof given === "number" && Number.isFinite(given)) {
      let n = f.type === "int" ? Math.round(given) : given;
      if (f.min !== undefined) n = Math.max(f.min, n);
      if (f.max !== undefined) n = Math.min(f.max, n);
      v = n;
    }
    out[f.key] = v;
  }
  return out;
}

export const num = (v: Values, k: string) => Number(v[k]);
export const bool = (v: Values, k: string) => v[k] === true;
export const str = (v: Values, k: string) => String(v[k]);
