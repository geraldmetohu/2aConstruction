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
    { key: "work", label: "Type of re-roof", type: "select", default: "NEW", public: true, options: [["NEW", "Strip and re-cover with new tiles / slates"], ["REUSE", "Strip and re-lay the existing (25% new)"]] },
    { key: "slopes", label: "Which slopes", type: "select", default: "BOTH", public: true, options: [["BOTH", "Whole roof"], ["FRONT", "Front slope only"], ["REAR", "Rear slope only"]] },
    { key: "length", label: "Roof length (along ridge)", type: "number", unit: "m", default: 8, min: 2, max: 30, public: true },
    { key: "depth", label: "House depth (front to back)", type: "number", unit: "m", default: 7, min: 2, max: 20, public: true },
    { key: "pitch", label: "Roof pitch", type: "number", unit: "°", default: 35, min: 15, max: 60 },
    { key: "shape", label: "Roof shape", type: "select", default: "GABLE", public: true, options: [["GABLE", "Gable ends"], ["HIP", "Hipped"]] },
    { key: "covering", label: "Covering", type: "select", default: "SLATE", public: true, clientChoice: true, options: coveringOptions },
    { key: "strip", label: "Strip existing covering", type: "boolean", default: true },
    { key: "rainwater", label: "New fascia, soffit & guttering", type: "boolean", default: true, public: true },
    { key: "chimneys", label: "Chimneys to re-flash", type: "int", default: 1, min: 0, max: 4 },
    { key: "chimneyRepoint", label: "Chimneys to repoint & re-flaunch", type: "int", default: 0, min: 0, max: 4 },
    { key: "valleys", label: "Valleys", type: "number", unit: "m", default: 0, min: 0, max: 40 },
    { key: "rafterRepair", label: "Rafters to sister / replace", type: "number", unit: "m", default: 0, min: 0, max: 100, hint: "Allowance for rotten timbers" },
    ...rooflineFields("Roofline", { fascia: "225", soffit: "300", downpipes: 2, height: 5.5 }).map(f => ({ ...f, when: [{ key: "rainwater", is: true }] })),
  ],
  needsScaffold: () => true,
  skips: () => 3,
  build(ctx, v) {
    const L = num(v, "length"), D = num(v, "depth"), pitch = num(v, "pitch") * Math.PI / 180;
    const c = coverings[str(v, "covering") as keyof typeof coverings] ?? coverings.SLATE;
    const slopes = str(v, "slopes"), part = slopes === "BOTH" ? 1 : 0.5;
    const reuse = str(v, "work") === "REUSE";
    const A = qty2(L * D / Math.cos(pitch) * part);
    const hip = str(v, "shape") === "HIP";
    const slopeLen = (D / 2) / Math.cos(pitch);
    const ridge = qty2(hip ? Math.max(0, L - D) + 4 * Math.sqrt(slopeLen ** 2 + (D / 2) ** 2) : L);
    const which = slopes === "BOTH" ? "" : slopes === "FRONT" ? " (front slope)" : " (rear slope)";
    const areaText = `${fmt(L)} × ${fmt(D)} m ÷ cos ${num(v, "pitch")}°${part < 1 ? " × ½" : ""} = ${fmt(A)} m²`;
    const S = "Re-roof";
    if (reuse) ctx.labour(S, "roof_strip_reuse", A, `${areaText}${which}`);
    else if (bool(v, "strip")) ctx.labour(S, "roof_strip", A, `${areaText}${which}`);
    ctx.material(S, "breather_membrane", Math.ceil(A * 1.1), `${fmt(A)} m² + 10% laps`);
    ctx.material(S, "batten_25x50", Math.ceil(A * c.battenM), `${fmt(A)} m² × ${c.battenM} m/m²`);
    ctx.material(S, "eaves_protector", Math.ceil((hip ? 2 * (L + D) : 2 * L) * part / 1.5), "eaves trays every 1.5 m");
    const count = Math.ceil(A * c.perM2 * (reuse ? 0.25 : 1.05));
    ctx.material(S, c.tile, count, reuse ? `${fmt(A)} m² × ${c.perM2}/m² × 25% replacements` : `${fmt(A)} m² × ${c.perM2}/m² + 5% breakage`, reuse ? `${ctx.rates.materials[c.tile].name} – replacements` : undefined);
    if (c.tile !== "tile_concrete" && c.tile !== "tile_clay_pantile") ctx.material(S, "slate_nails", Math.ceil(A), `${fmt(A)} m²`);
    const ridgeLen = qty2(ridge * (slopes === "BOTH" ? 1 : 1));
    ctx.material(S, "ridge_tile", Math.ceil(ridgeLen / 0.45 * (reuse ? 0.3 : 1)), `${hip ? "ridge + 4 hips" : "ridge"} ${fmt(ridgeLen)} m ÷ 0.45 m${reuse ? " × 30% replacements" : ""}`);
    ctx.material(S, "dry_ridge", qty2((ridgeLen + (hip ? 0 : 4 * slopeLen)) * (part < 1 ? 0.5 : 1)), hip ? `${fmt(ridgeLen)} m ridge & hips` : `${fmt(ridgeLen)} m ridge + 4 verges × ${fmt(slopeLen)} m`);
    ctx.labour(S, c.task, A, `${fmt(A)} m²${which}`);
    const valleys = num(v, "valleys");
    if (valleys) { ctx.material(S, "lead_valley", valleys, `${fmt(valleys)} m`); ctx.labour(S, "valley_fit", valleys, `${fmt(valleys)} m`); }
    const rafters = num(v, "rafterRepair");
    if (rafters) { ctx.material(S, "timber_47x150", qty2(rafters * 1.1), `${fmt(rafters)} m + 10%`, "Rafter repairs – C24 47 × 150"); ctx.labour(S, "rafter_repair", rafters, `${fmt(rafters)} m`); }
    const ch = num(v, "chimneys");
    if (ch) { ctx.material(S, "lead_flashing", ch * 5, `${ch} × 5 m`); ctx.labour(S, "chimney_flashing", ch, `${ch} chimney${ch > 1 ? "s" : ""}`); }
    const rp = num(v, "chimneyRepoint");
    if (rp) { ctx.material(S, "mortar_cement", rp * 2, `${rp} × 2 bags`); ctx.material(S, "mortar_sand", rp * 0.3, `${rp} × 0.3 t`); ctx.labour(S, "chimney_repoint", rp, `${rp} chimney${rp > 1 ? "s" : ""}`); }
    if (bool(v, "rainwater")) {
      const eaves = qty2((hip ? 2 * (L + D) : 2 * L) * part);
      fasciaSoffit(ctx, S, { length: eaves, fascia: str(v, "fasciaWidth"), soffit: str(v, "soffitWidth"), colour: str(v, "rooflineColour"), corners: hip && part === 1 ? 4 : 0, eaves: true, label: `${part < 1 ? "1" : hip ? "4" : "2"} eaves` });
      rainwater(ctx, S, { length: eaves, downpipes: num(v, "downpipes"), height: num(v, "downpipeHeight"), angles90: hip && part === 1 ? Math.max(4, num(v, "angles90")) : num(v, "angles90"), angles135: num(v, "angles135"),
        stopEnds: hip && part === 1 ? 0 : Math.max(num(v, "stopEnds"), part < 1 ? 2 : 4), profile: str(v, "gutterProfile"), pipe: str(v, "pipe") as "ROUND" | "SQUARE", label: "eaves" });
    }
    ctx.scope(`${reuse ? "Strip carefully and re-lay the existing covering (about 25% new)" : "Strip and re-cover"}${which} ${fmt(A)} m² ${hip ? "hipped" : "gable"} roof at ${num(v, "pitch")}° with breathable membrane, new battens and ${c.label}, dry ridge${hip ? " and hips" : " and verges"}${valleys ? `, ${fmt(valleys)} m lead valleys` : ""}${rafters ? `, ${fmt(rafters)} m rafter repairs` : ""}${ch ? `, re-flash ${ch} chimney${ch > 1 ? "s" : ""}` : ""}${rp ? `, repoint ${rp} chimney${rp > 1 ? "s" : ""}` : ""}${bool(v, "rainwater") ? ", new fascia, soffit and guttering" : ""}.`);
    ctx.assume(rafters ? "Rafter repairs are an allowance; actual timbers replaced are charged at the same rate." : "Re-roof assumes sound rafters; replacement of rotten timbers is an extra over item.");
    if (reuse) ctx.assume("Re-laying the existing covering assumes about 75% can be re-used; extra replacements charged at cost.");
  },
};
