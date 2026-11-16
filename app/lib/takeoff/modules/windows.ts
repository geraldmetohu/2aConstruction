import { bool, num, str, type WorkPackage } from "../package";
import { fmt } from "../util";

export const windowOptions: [string, string][] = [["UPVC", "uPVC A-rated"], ["ALU", "Aluminium"], ["SASH", "Timber sliding sash"]];
const frontOptions: [string, string][] = [["NONE", "No front door"], ["COMPOSITE", "Composite"], ["TIMBER", "Hardwood"], ["ALU", "Aluminium"]];
const rearOptions: [string, string][] = [["NONE", "None"], ["FRENCH", "uPVC French / patio doors"], ["BIFOLD", "Aluminium bi-fold"], ["SLIDING", "Aluminium sliding"]];

const winKey = (t: string, large: boolean) => t === "ALU" ? (large ? "window_alu_large" : "window_alu") : t === "SASH" ? (large ? "window_sash_large" : "window_sash") : (large ? "window_upvc_large" : "window_upvc");

/** Replacement windows and external doors, porches and canopies. */
export const windowsPackage: WorkPackage = {
  id: "windows", label: "Windows, doors & porches", short: "Windows & doors",
  description: "Replacement windows (uPVC, aluminium or timber sash), triple glazing, composite and hardwood front doors, French, bi-fold and sliding doors, porches and door canopies. FENSA certified.",
  fields: [
    { key: "type", label: "Window type", type: "select", default: "UPVC", clientChoice: true, options: windowOptions, public: true, group: "Windows" },
    { key: "windows", label: "Standard windows (≈ 1.2 × 1.2 m)", type: "int", default: 0, min: 0, max: 40, public: true, group: "Windows" },
    { key: "large", label: "Large windows (≈ 1.8 × 1.4 m)", type: "int", default: 0, min: 0, max: 20, public: true, group: "Windows" },
    { key: "triple", label: "Triple glazing", type: "boolean", default: false, clientChoice: true, group: "Windows" },

    { key: "front", label: "Front door", type: "select", default: "NONE", clientChoice: true, options: frontOptions, public: true, group: "Doors" },
    { key: "rear", label: "Rear doors", type: "select", default: "NONE", options: rearOptions, public: true, group: "Doors" },
    { key: "rearWidth", label: "Rear door opening width", type: "number", unit: "m", default: 3, min: 1.2, max: 8, group: "Doors", when: [{ key: "rear", in: ["BIFOLD", "SLIDING"] }] },
    { key: "porch", label: "New porch", type: "number", unit: "m²", default: 0, min: 0, max: 12, group: "Porch & canopy", hint: "Under 3 m² floor area is usually permitted development" },
    { key: "canopy", label: "Door canopy", type: "boolean", default: false, group: "Porch & canopy" },
  ],
  needsScaffold: v => num(v, "windows") + num(v, "large") > 8,
  skips: v => num(v, "windows") + num(v, "large") > 6 ? 1 : 0,
  build(ctx, v) {
    const t = str(v, "type"), w = num(v, "windows"), L = num(v, "large"), n = w + L;
    const name = windowOptions.find(([k]) => k === t)?.[1] ?? "uPVC";
    if (n) {
      const S = "Windows";
      ctx.labour(S, "window_replace", n, `${n} windows`);
      if (w) ctx.material(S, winKey(t, false), w, `${w} standard`);
      if (L) ctx.material(S, winKey(t, true), L, `${L} large`);
      if (bool(v, "triple")) ctx.material(S, "triple_glazing", n, `${n} windows`);
      ctx.material(S, "window_fixings_kit", n, `${n} windows`);
      ctx.scope(`Windows: remove ${n} existing window${n === 1 ? "" : "s"} and fit new ${name.toLowerCase()} ${bool(v, "triple") ? "triple" : "double"}-glazed units${L ? ` (${L} large)` : ""} with trickle vents, toughened glass where required, new cills and trims; reveals made good and sealed. FENSA certificate on completion.`, S);
      ctx.assume("Windows are measured and ordered after the deposit is paid; lead time is usually 4–6 weeks (8–10 weeks for timber sash).");
      if (t === "UPVC") ctx.assume("In a conservation area or a listed building uPVC may not be allowed – check before ordering.");
    }
    const front = str(v, "front"), rear = str(v, "rear");
    if (front !== "NONE" || rear !== "NONE") {
      const S = "Doors", p: string[] = [];
      if (front !== "NONE") {
        ctx.labour(S, "front_door_replace", 1, "1 door");
        ctx.material(S, front === "TIMBER" ? "door_timber_front" : front === "ALU" ? "door_alu_front" : "door_composite", 1, "1 door");
        p.push(`a new ${frontOptions.find(([k]) => k === front)?.[1].toLowerCase()} front door and frame with multi-point lock, letter plate and threshold`);
      }
      if (rear === "FRENCH") { ctx.labour(S, "patio_door_replace", 1, "1 set"); ctx.material(S, "patio_door_upvc", 1, "1 set"); p.push("new uPVC French doors"); }
      if (rear === "BIFOLD" || rear === "SLIDING") {
        const rw = num(v, "rearWidth");
        ctx.labour(S, "bifold_install", rw, `${fmt(rw)} m`);
        ctx.material(S, rear === "BIFOLD" ? "bifold_alu" : "sliding_alu", rw, `${fmt(rw)} m wide`);
        p.push(`aluminium ${rear === "BIFOLD" ? "bi-fold" : "sliding"} doors ${fmt(rw)} m wide in an existing opening`);
      }
      ctx.scope(`Doors: ${p.join("; ")}; all sealed, trimmed and made good.`, S);
    }
    const porch = num(v, "porch");
    if (porch || bool(v, "canopy")) {
      const S = "Porch & canopy";
      if (porch) { ctx.labour(S, "porch_build", porch, `${fmt(porch)} m²`); ctx.material(S, "porch_kit", porch, `${fmt(porch)} m²`); }
      if (bool(v, "canopy")) { ctx.labour(S, "door_canopy_fit", 1, "1 canopy"); ctx.material(S, "door_canopy", 1, "1 canopy"); }
      ctx.scope(`Porch: ${[porch ? `build a ${fmt(porch)} m² porch on a new base with dwarf walls, glazed frame and roof` : "", bool(v, "canopy") ? "fit a GRP canopy over the front door" : ""].filter(Boolean).join("; ")}.`, S);
      if (porch > 3) ctx.warn("A porch over 3 m² (or within 2 m of the road, or over 3 m high) needs planning permission.");
    }
    if (!n && front === "NONE" && rear === "NONE" && !porch && !bool(v, "canopy")) ctx.warn("Windows & doors is switched on but nothing is chosen yet.");
  },
};
