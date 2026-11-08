import { bool, num, str, type WorkPackage } from "../package";
import { fmt, qty2 } from "../util";
import { fasciaSoffit, rainwater, rooflineFields } from "./common";

const coverings = {
  CONCRETE: { tile: "tile_concrete", perM2: 10, battenM: 3, task: "roof_tiling_concrete", label: "concrete interlocking tiles" },
  CONCRETE_PLAIN: { tile: "tile_concrete_plain", perM2: 60, battenM: 10, task: "roof_tiling_concrete_plain", label: "concrete plain tiles" },
  SLATE: { tile: "slate_natural", perM2: 20, battenM: 5, task: "roof_tiling_slate", label: "natural slate" },
  FIBRE_SLATE: { tile: "slate_fibre_cement", perM2: 13, battenM: 4, task: "roof_tiling_fibre_slate", label: "fibre cement (artificial) slate" },
  CLAY: { tile: "tile_clay_plain", perM2: 60, battenM: 10, task: "roof_tiling_clay", label: "clay plain tiles" },
  PANTILE: { tile: "tile_clay_pantile", perM2: 16, battenM: 3, task: "roof_tiling_pantile", label: "clay pantiles" },
} as const;
export const coveringOptions: [string, string][] = [
  ["CONCRETE", "Concrete interlocking tiles"], ["CONCRETE_PLAIN", "Concrete plain tiles"], ["SLATE", "Natural slate"],
  ["FIBRE_SLATE", "Fibre cement (artificial) slate"], ["CLAY", "Clay plain tiles"], ["PANTILE", "Clay pantiles"],
];

export const roofingPackage: WorkPackage = {
  id: "roofing", label: "Re-roof (pitched)", short: "Roof",
  description: "Re-roof a pitched roof: new covering or re-lay existing, one or both slopes, membrane, battens, ridge, hips, valleys, flashings, repairs and rainwater goods.",
  fields: [
    { key: "work", label: "Type of re-roof", type: "select", default: "NEW", public: true, group: "Roof", options: [["NEW", "Strip and re-cover with new tiles / slates"], ["REUSE", "Strip and re-lay the existing (25% new)"]] },
    { key: "shape", label: "Roof shape", type: "select", default: "GABLE", public: true, group: "Roof", options: [
      ["GABLE", "Gable ended – 2 slopes"], ["HIP", "Hipped – 4 slopes"], ["MONO", "Mono-pitch / lean-to – 1 slope"], ["COMPLEX", "Complex – several faces, hips & valleys (enter the measurements)"]] },
    { key: "slopes", label: "Which slopes", type: "select", default: "BOTH", public: true, group: "Roof", options: [["BOTH", "Whole roof"], ["FRONT", "Front slope only"], ["REAR", "Rear slope only"]], when: [{ key: "shape", in: ["GABLE", "HIP"] }] },
    { key: "length", label: "Roof length (along ridge / eaves)", type: "number", unit: "m", default: 8, min: 2, max: 30, public: true, group: "Roof", when: [{ key: "shape", not: "COMPLEX" }] },
    { key: "depth", label: "House depth (front to back; mono: eaves to top)", type: "number", unit: "m", default: 7, min: 1, max: 20, public: true, group: "Roof", when: [{ key: "shape", not: "COMPLEX" }] },
    { key: "pitch", label: "Roof pitch", type: "number", unit: "°", default: 35, min: 12, max: 60, group: "Roof" },
    { key: "roofArea", label: "Total roof slope area", type: "number", unit: "m²", default: 120, min: 5, max: 1500, group: "Roof", when: [{ key: "shape", is: "COMPLEX" }] },
    { key: "ridgeLen", label: "Ridges", type: "number", unit: "m", default: 10, min: 0, max: 200, group: "Roof", when: [{ key: "shape", is: "COMPLEX" }] },
    { key: "hipLen", label: "Hips", type: "number", unit: "m", default: 12, min: 0, max: 200, group: "Roof", when: [{ key: "shape", is: "COMPLEX" }] },
    { key: "eavesLen", label: "Eaves (gutter line)", type: "number", unit: "m", default: 30, min: 0, max: 300, group: "Roof", when: [{ key: "shape", is: "COMPLEX" }] },
    { key: "vergeLen", label: "Verges (gable edges)", type: "number", unit: "m", default: 8, min: 0, max: 200, group: "Roof", when: [{ key: "shape", is: "COMPLEX" }] },
    { key: "covering", label: "Covering", type: "select", default: "SLATE", public: true, clientChoice: true, options: coveringOptions, group: "Covering" },
    { key: "strip", label: "Strip existing covering", type: "boolean", default: true, group: "Covering" },
    { key: "valleys", label: "Valleys", type: "number", unit: "m", default: 0, min: 0, max: 80, group: "Covering" },
    { key: "valleyType", label: "Valley type", type: "select", default: "GRP", group: "Covering", options: [["GRP", "GRP valley trough (V-shaped)"], ["LEAD", "Lead-lined valley"], ["DRY", "Dry valley system"]], when: [{ key: "valleys", gt: 0 }] },
    { key: "ventTiles", label: "Ventilation tiles / soil vent terminals", type: "int", default: 2, min: 0, max: 20, group: "Covering" },
    { key: "structure", label: "Rafters", type: "select", default: "REPAIR", group: "Structure", options: [
      ["SOUND", "Sound – no work"], ["REPAIR", "Repair some rafters (enter metres)"], ["SISTER", "Strengthen all rafters (sister)"], ["RENEW", "Renew the roof structure (rafters, purlins, bracing)"]] },
    { key: "rafterRepair", label: "Rafters to sister / replace", type: "number", unit: "m", default: 0, min: 0, max: 200, hint: "Allowance for rotten timbers", group: "Structure", when: [{ key: "structure", is: "REPAIR" }] },
    { key: "loftInsulation", label: "Top up loft insulation (270 mm)", type: "boolean", default: false, group: "Structure" },
    { key: "chimneys", label: "Chimneys to re-flash", type: "int", default: 1, min: 0, max: 6, group: "Chimneys" },
    { key: "chimneyRepoint", label: "Chimneys to repoint & re-flaunch", type: "int", default: 0, min: 0, max: 6, group: "Chimneys" },
    { key: "chimneyRemove", label: "Chimney stacks to take down below the roof", type: "int", default: 0, min: 0, max: 4, group: "Chimneys" },
    { key: "rainwater", label: "New fascia, soffit, guttering & downpipes", type: "boolean", default: true, public: true, group: "Roofline" },
    ...rooflineFields("Roofline", { fascia: "225", soffit: "300", downpipes: 2, height: 5.5 }).map(f => ({ ...f, when: [{ key: "rainwater", is: true }] })),
  ],
  needsScaffold: () => true,
  skips: () => 3,
  build(ctx, v) {
    const shape = str(v, "shape"), complex = shape === "COMPLEX", mono = shape === "MONO", hip = shape === "HIP";
    const L = num(v, "length"), D = num(v, "depth"), pitch = num(v, "pitch") * Math.PI / 180;
    const c = coverings[str(v, "covering") as keyof typeof coverings] ?? coverings.SLATE;
    const slopes = mono || complex ? "BOTH" : str(v, "slopes"), part = slopes === "BOTH" ? 1 : 0.5;
    const reuse = str(v, "work") === "REUSE";
    const A = qty2(complex ? num(v, "roofArea") : mono ? L * D / Math.cos(pitch) : L * D / Math.cos(pitch) * part);
    const slopeLen = mono ? D / Math.cos(pitch) : (D / 2) / Math.cos(pitch);
    const ridge = qty2(complex ? num(v, "ridgeLen") + num(v, "hipLen") : mono ? 0 : hip ? Math.max(0, L - D) + 4 * Math.sqrt(slopeLen ** 2 + (D / 2) ** 2) : L);
    const verges = qty2(complex ? num(v, "vergeLen") : mono ? 2 * slopeLen : hip ? 0 : 4 * slopeLen * part);
    const eavesLen = qty2(complex ? num(v, "eavesLen") : mono ? L : (hip ? 2 * (L + D) : 2 * L) * part);
    const which = slopes === "BOTH" ? "" : slopes === "FRONT" ? " (front slope)" : " (rear slope)";
    const shapeText = complex ? "complex" : mono ? "mono-pitch" : hip ? "hipped" : "gable";
    const areaText = complex ? `${fmt(A)} m² measured` : `${fmt(L)} × ${fmt(D)} m ÷ cos ${num(v, "pitch")}°${part < 1 ? " × ½" : ""} = ${fmt(A)} m²`;
    const S = "Re-roof";
    if (reuse) ctx.labour(S, "roof_strip_reuse", A, `${areaText}${which}`);
    else if (bool(v, "strip")) ctx.labour(S, "roof_strip", A, `${areaText}${which}`);
    ctx.material(S, "breather_membrane", Math.ceil(A * 1.1), `${fmt(A)} m² + 10% laps`);
    ctx.material(S, "batten_25x50", Math.ceil(A * c.battenM), `${fmt(A)} m² × ${c.battenM} m/m²`);
    // Structure first: strengthen or renew rafters where needed.
    const struct = str(v, "structure");
    if (struct === "SISTER") { ctx.material(S, "roof_timber", qty2(A * 0.6), `${fmt(A)} m² × 0.6 (sister rafters)`, "C24 timber – sister every rafter"); ctx.labour(S, "rafter_sister", A, `${fmt(A)} m²`); }
    if (struct === "RENEW") { ctx.material(S, "roof_timber", A, `${fmt(A)} m²`); ctx.labour(S, "roof_restructure", A, `${fmt(A)} m²`); }
    ctx.material(S, "eaves_protector", Math.ceil(eavesLen / 1.5), `${fmt(eavesLen)} m of eaves ÷ 1.5 m`);
    const count = Math.ceil(A * c.perM2 * (reuse ? 0.25 : 1.05));
    ctx.material(S, c.tile, count, reuse ? `${fmt(A)} m² × ${c.perM2}/m² × 25% replacements` : `${fmt(A)} m² × ${c.perM2}/m² + 5% breakage`, reuse ? `${ctx.rates.materials[c.tile].name} – replacements` : undefined);
    if (c.tile !== "tile_concrete" && c.tile !== "tile_clay_pantile") ctx.material(S, "slate_nails", Math.ceil(A), `${fmt(A)} m²`);
    const ridgeLen = qty2(ridge * (slopes === "BOTH" ? 1 : 1));
    if (ridgeLen > 0) ctx.material(S, "ridge_tile", Math.ceil(ridgeLen / 0.45 * (reuse ? 0.3 : 1)), `${hip ? "ridge + 4 hips" : complex ? "ridges + hips" : "ridge"} ${fmt(ridgeLen)} m ÷ 0.45 m${reuse ? " × 30% replacements" : ""}`);
    if (ridgeLen + verges > 0) ctx.material(S, "dry_ridge", qty2(ridgeLen * (part < 1 ? 0.5 : 1) + verges), `${fmt(ridgeLen)} m ridge${hip || complex ? " & hips" : ""} + ${fmt(verges)} m verges`);
    if (mono) { ctx.material(S, "lead_flashing", qty2(L + 0.3), "top abutment"); ctx.labour(S, "mono_abutment", L, `${fmt(L)} m top edge`); }
    const vents = num(v, "ventTiles");
    if (vents) { ctx.material(S, "vent_tile", vents, `${vents} vents`); ctx.labour(S, "vent_tile_fit", vents, `${vents} vents`); }
    ctx.labour(S, c.task, A, `${fmt(A)} m²${which}`);
    const valleys = num(v, "valleys");
    const vt = str(v, "valleyType");
    if (valleys) { ctx.material(S, vt === "LEAD" ? "lead_valley" : vt === "DRY" ? "dry_valley" : "grp_valley", valleys, `${fmt(valleys)} m`); ctx.labour(S, "valley_fit", valleys, `${fmt(valleys)} m`); }
    const rafters = struct === "REPAIR" ? num(v, "rafterRepair") : 0;
    if (rafters) { ctx.material(S, "timber_47x150", qty2(rafters * 1.1), `${fmt(rafters)} m + 10%`, "Rafter repairs – C24 47 × 150"); ctx.labour(S, "rafter_repair", rafters, `${fmt(rafters)} m`); }
    const ch = num(v, "chimneys");
    if (ch) { ctx.material(S, "lead_flashing", ch * 5, `${ch} × 5 m`); ctx.labour(S, "chimney_flashing", ch, `${ch} chimney${ch > 1 ? "s" : ""}`); }
    const rp = num(v, "chimneyRepoint");
    if (rp) { ctx.material(S, "mortar_cement", rp * 2, `${rp} × 2 bags`); ctx.material(S, "mortar_sand", rp * 0.3, `${rp} × 0.3 t`); ctx.labour(S, "chimney_repoint", rp, `${rp} chimney${rp > 1 ? "s" : ""}`); }
    const stacks = num(v, "chimneyRemove");
    if (stacks) { ctx.labour(S, "chimney_stack_remove", stacks, `${stacks} stack${stacks > 1 ? "s" : ""}`); ctx.material(S, "batten_25x50", stacks * 6, "patch battens"); ctx.assume("Taking down a chimney stack: the breast below must stay supported or be removed; party wall notice if it is shared."); }
    if (bool(v, "loftInsulation")) { const la = qty2(complex ? A * 0.7 : L * D * part); ctx.material(S, "loft_wool_270", Math.ceil(la), `${fmt(la)} m² plan area`); ctx.labour(S, "insulation_fit", la, `${fmt(la)} m² loft`); }
    if (bool(v, "rainwater")) {
      const eaves = eavesLen;
      fasciaSoffit(ctx, S, { length: eaves, fascia: str(v, "fasciaWidth"), soffit: str(v, "soffitWidth"), colour: str(v, "rooflineColour"), corners: hip && part === 1 ? 4 : 0, eaves: true, label: `${mono || part < 1 ? "1" : hip ? "4" : complex ? "all" : "2"} eaves` });
      rainwater(ctx, S, { length: eaves, downpipes: num(v, "downpipes"), height: num(v, "downpipeHeight"), angles90: hip && part === 1 ? Math.max(4, num(v, "angles90")) : num(v, "angles90"), angles135: num(v, "angles135"),
        stopEnds: hip && part === 1 ? 0 : Math.max(num(v, "stopEnds"), part < 1 ? 2 : 4), profile: str(v, "gutterProfile"), pipe: str(v, "pipe") as "ROUND" | "SQUARE", label: "eaves" });
    }
    ctx.scope(`${reuse ? "Strip carefully and re-lay the existing covering (about 25% new)" : "Strip and re-cover"}${which} ${fmt(A)} m² ${shapeText} roof at ${num(v, "pitch")}° with breathable membrane, new battens and ${c.label}, dry ridge${hip ? " and hips" : " and verges"}${valleys ? `, ${fmt(valleys)} m ${vt === "LEAD" ? "lead-lined" : vt === "DRY" ? "dry" : "GRP"} valleys` : ""}${vents ? `, ${vents} ventilation tiles` : ""}${rafters ? `, ${fmt(rafters)} m rafter repairs` : ""}${struct === "SISTER" ? ", all rafters strengthened" : struct === "RENEW" ? ", new roof structure (rafters, purlins & bracing)" : ""}${stacks ? `, ${stacks} chimney stack${stacks > 1 ? "s" : ""} taken down` : ""}${ch ? `, re-flash ${ch} chimney${ch > 1 ? "s" : ""}` : ""}${rp ? `, repoint ${rp} chimney${rp > 1 ? "s" : ""}` : ""}${bool(v, "rainwater") ? ", new fascia, soffit and guttering" : ""}.`);
    if (struct === "SOUND" || struct === "REPAIR") ctx.assume(rafters ? "Rafter repairs are an allowance; actual timbers replaced are charged at the same rate." : "Re-roof assumes sound rafters; replacement of rotten timbers is an extra over item.");
    if (reuse) ctx.assume("Re-laying the existing covering assumes about 75% can be re-used; extra replacements charged at cost.");
  },
};
