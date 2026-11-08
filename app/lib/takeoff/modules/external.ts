import { bool, num, str, type WorkPackage } from "../package";
import { fmt, qty2 } from "../util";
import type { Ctx } from "../engine";

const ceil = (x: number) => Math.ceil(x - 1e-9);
const storeyHeight: Record<string, number> = { ONE: 2.7, TWO: 5.4, THREE: 8.1 };

export const renderSystemOptions: [string, string][] = [
  ["SILICONE", "Silicone thin-coat render (base coat & mesh)"],
  ["ACRYLIC", "Acrylic (“plastic”) thin-coat render (base coat & mesh)"],
  ["MONOCOUCHE", "Monocouche through-colour render"],
  ["POLYMER", "Polymer through-colour render (K Rend type)"],
  ["SAND_CEMENT", "Sand & cement render, painted"],
  ["PAINT_ONLY", "Repaint existing render / brick (masonry paint)"],
];
export const ewiBoardOptions: [string, string][] = [
  ["ewi_eps_50", "EPS 50 mm"], ["ewi_eps_90", "EPS 90 mm (≈ U 0.30 on solid brick)"], ["ewi_eps_100", "EPS 100 mm"],
  ["ewi_eps_150", "EPS 150 mm"], ["ewi_mineral_100", "Mineral wool 100 mm (non-combustible)"],
];

/** Render finishes for new walls (extension walls, loft gables, dormer cladding). */
export const newRenderOptions: [string, string][] = [["SILICONE", "Silicone thin-coat (base coat & mesh)"], ["ACRYLIC", "Acrylic (“plastic”) thin-coat (base coat & mesh)"],
  ["MONOCOUCHE", "Monocouche through-colour"], ["POLYMER", "Polymer through-colour (K Rend type)"], ["SAND_CEMENT", "Sand & cement, painted"]];
/** Thin-coat finishes on base coat & mesh, and the through-colour (thick) ones. */
const THIN: Record<string, { key: string; label: string }> = { SILICONE: { key: "render_silicone", label: "silicone" }, ACRYLIC: { key: "render_acrylic", label: "acrylic" } };
const THICK: Record<string, { key: string; label: string }> = { MONOCOUCHE: { key: "render_mono_mix", label: "monocouche" }, POLYMER: { key: "render_polymer", label: "polymer (K Rend type)" } };

/**
 * Render on new blockwork: beads (≈ 0.6 m per m² for corners, reveals and stops unless given), then the system.
 * Returns a short description for the scope.
 */
export function renderNewWall(ctx: Ctx, S: string, area: number, system: string, label: string, beadsM?: number) {
  if (area <= 0) return "";
  const A = qty2(area), b = qty2(beadsM ?? A * 0.6);
  ctx.material(S, "render_bead", Math.ceil(b * 1.05 / 2.5 - 1e-9), `${beadsM === undefined ? `${fmt(A)} m² × 0.6 m/m²` : `${fmt(b)} m`} + 5% ÷ 2.5 m`, `Render beads – ${label}`);
  ctx.labour(S, "render_beads", b, `${label} ${fmt(b)} m`);
  if (system === "SAND_CEMENT") {
    ctx.material(S, "render_sc_mix", A, `${label} ${fmt(A)} m²`);
    ctx.labour(S, "render_sand_cement", A, `${label} ${fmt(A)} m²`);
    ctx.material(S, "masonry_paint", Math.ceil(A * 2 / 5 / 10 - 1e-9), `${fmt(A)} m² × 2 coats ÷ 5 m²/L ÷ 10 L`);
    ctx.labour(S, "masonry_paint_apply", A, `${label} ${fmt(A)} m²`);
    return "sand & cement render with two coats of masonry paint";
  }
  if (THICK[system]) {
    ctx.material(S, THICK[system].key, A, `${label} ${fmt(A)} m²`);
    ctx.labour(S, "render_mono", A, `${label} ${fmt(A)} m²`);
    return `${THICK[system].label} through-colour render`;
  }
  const thin = THIN[system] ?? THIN.SILICONE;
  ctx.material(S, "render_basecoat", A, `${label} ${fmt(A)} m²`);
  ctx.material(S, "render_mesh", qty2(A * 1.1), `${fmt(A)} m² + 10% laps`);
  ctx.material(S, "render_primer", A, `${label} ${fmt(A)} m²`);
  ctx.material(S, thin.key, A, `${label} ${fmt(A)} m²`);
  ctx.labour(S, "render_thincoat", A, `${label} ${fmt(A)} m²`);
  return `base coat with mesh and ${thin.label} thin-coat render`;
}

/** Cladding for new framed walls (dormer cheeks & face, extension upper walls). */
export const claddingOptions: [string, string][] = [
  ["TILE", "Tile hanging"], ["SLATE", "Slate hanging"], ["RENDER", "Render on ply & carrier board"],
  ["COMPOSITE", "Composite (wood-plastic) cladding"], ["TIMBER", "Timber cladding (larch / cedar)"], ["BRICK", "Facing brick (on steel support)"],
];

/** Clad a new framed wall. Returns the words for the scope. */
export function cladNewWall(ctx: Ctx, S: string, area: number, type: string, label: string, o: { renderSystem?: string; brick?: string; formula?: string } = {}) {
  if (area <= 0) return "";
  const A = qty2(area), f = o.formula ?? `${fmt(A)} m²`;
  switch (type) {
    case "SLATE": ctx.material(S, "clad_slate", Math.ceil(A * 1.05 - 1e-9), `${f} + 5%`); ctx.labour(S, "tile_hanging", A, `${label} ${fmt(A)} m²`); return "slate hanging";
    case "RENDER": {
      ctx.material(S, "render_carrier", A, f); ctx.labour(S, "render_board_fit", A, `${label} ${fmt(A)} m²`);
      return `ply sheathing, membrane and render carrier board with ${renderNewWall(ctx, S, A, o.renderSystem ?? "SILICONE", label)}`;
    }
    case "COMPOSITE": case "TIMBER":
      ctx.material(S, type === "COMPOSITE" ? "clad_composite" : "clad_timber", Math.ceil(A * 1.1 - 1e-9), `${f} + 10% cutting`);
      ctx.material(S, "clad_battens", A, f); ctx.labour(S, "cladding_fit", A, `${label} ${fmt(A)} m²`);
      return type === "COMPOSITE" ? "composite (wood-plastic) cladding on battens" : "timber cladding on battens";
    case "BRICK":
      ctx.material(S, o.brick ?? "facing_brick", Math.ceil(A * 60 * 1.05), `${f} × 60 bricks + 5%`, `Facing brick – ${label}`);
      ctx.material(S, "wall_ties", Math.ceil(A * 2.5), `${fmt(A)} m² × 2.5 ties`);
      ctx.material(S, "mortar_cement", Math.ceil(A * 0.03 * 12), `${fmt(A)} m² × 0.03 m³ × 12 bags`);
      ctx.labour(S, "facing_brickwork", A, `${label} ${fmt(A)} m²`);
      ctx.assume(`Brick ${label} is built off steel support to the engineer's design.`);
      return "facing brickwork";
    default: ctx.material(S, "clad_tile_hanging", Math.ceil(A * 1.05 - 1e-9), `${f} + 5%`); ctx.labour(S, "tile_hanging", A, `${label} ${fmt(A)} m²`); return "tile hanging";
  }
}

const notPaintOnly = [{ key: "system", not: "PAINT_ONLY" }];

/**
 * Outside walls: render, re-render or external wall insulation (EWI), or masonry paint only.
 * Bead lengths come from the corners (× wall height), the window / door reveals (≈ 5 m each) and the base.
 */
export const externalPackage: WorkPackage = {
  id: "external", label: "External walls & render", short: "External",
  description: "Render or re-render the outside walls with or without external wall insulation (EWI): hack off, repairs, beads, sills, base coat & mesh, finish render or masonry paint.",
  fields: [
    { key: "area", label: "Wall area (less windows & doors)", type: "number", unit: "m²", default: 60, min: 1, max: 3000, public: true, group: "Walls", hint: "Each elevation: length × height, minus openings" },
    { key: "storeys", label: "Wall height", type: "select", default: "TWO", public: true, group: "Walls", options: [["ONE", "Single storey (no scaffold)"], ["TWO", "Two storeys"], ["THREE", "Three storeys or more"]] },
    { key: "openings", label: "Windows & doors in these walls", type: "int", default: 6, min: 0, max: 80, group: "Walls" },
    { key: "corners", label: "External corners", type: "int", default: 2, min: 0, max: 30, group: "Walls" },
    { key: "base", label: "Length along the base of the walls", type: "number", unit: "m", default: 12, min: 0, max: 500, group: "Walls" },

    { key: "system", label: "Finish", type: "select", default: "SILICONE", public: true, group: "Render system", options: renderSystemOptions },
    { key: "insulation", label: "External wall insulation (EWI)", type: "boolean", default: false, public: true, group: "Render system", hint: "Insulation boards under the render", when: [{ key: "system", in: ["SILICONE", "ACRYLIC", "MONOCOUCHE", "POLYMER"] }] },
    { key: "board", label: "Insulation board", type: "select", default: "ewi_eps_90", options: ewiBoardOptions, group: "Render system", when: [{ key: "system", in: ["SILICONE", "ACRYLIC", "MONOCOUCHE", "POLYMER"] }, { key: "insulation", is: true }] },
    { key: "sills", label: "Extended window sills", type: "int", default: 6, min: 0, max: 80, group: "Render system", hint: "Sills must project past the thicker wall", when: [{ key: "system", in: ["SILICONE", "ACRYLIC", "MONOCOUCHE", "POLYMER"] }, { key: "insulation", is: true }] },
    { key: "masonryPaint", label: "Masonry paint over the render (2 coats)", type: "boolean", default: true, group: "Render system", when: [{ key: "system", is: "SAND_CEMENT" }] },

    { key: "hackOff", label: "Hack off the existing render", type: "boolean", default: false, public: true, group: "Preparation", when: notPaintOnly },
    { key: "hackOffArea", label: "Area to hack off (0 = all of it)", type: "number", unit: "m²", default: 0, min: 0, max: 3000, group: "Preparation", when: [...notPaintOnly, { key: "hackOff", is: true }] },
    { key: "cracks", label: "Crack & patch repairs", type: "number", unit: "m", default: 0, min: 0, max: 500, group: "Preparation" },
    { key: "services", label: "Downpipes, pipes & fittings to take off and re-fix", type: "int", default: 2, min: 0, max: 40, group: "Preparation", when: notPaintOnly },

    { key: "colour", label: "Colour", type: "text", default: "", clientChoice: true, group: "Finish" },
    { key: "texture", label: "Render texture", type: "select", default: "1.5", clientChoice: true, group: "Finish", options: [["1.0", "Fine 1 mm"], ["1.5", "Standard 1.5 mm"], ["2.0", "Coarse 2 mm"]], when: [{ key: "system", in: ["SILICONE", "ACRYLIC"] }] },
  ],
  needsScaffold: v => v.storeys !== "ONE",
  skips: v => v.hackOff === true ? Math.max(1, ceil((Number(v.hackOffArea) || Number(v.area)) / 40)) : 0,
  build(ctx, v) {
    const A = qty2(num(v, "area")), sys = str(v, "system"), h = storeyHeight[str(v, "storeys")] ?? 5.4;
    const ewi = bool(v, "insulation") && ["SILICONE", "ACRYLIC", "MONOCOUCHE", "POLYMER"].includes(sys);
    const openings = num(v, "openings"), corners = num(v, "corners"), base = num(v, "base");
    const P = "Preparation", I = "Insulation", R = "Render", F = "Finish";
    const did: string[] = [];

    // Preparation
    ctx.labour(P, "render_mask_protect", A, `${fmt(A)} m² of wall`);
    ctx.material(P, "render_sundries", 1, "masking film, tape, ground sheets");
    const hack = sys !== "PAINT_ONLY" && bool(v, "hackOff") ? qty2(num(v, "hackOffArea") > 0 ? Math.min(A, num(v, "hackOffArea")) : A) : 0;
    if (hack) {
      ctx.labour(P, "render_hack_off", hack, `${fmt(hack)} m²`);
      did.push(`hack off ${fmt(hack)} m² of old render and clear away`);
    }
    const cracks = num(v, "cracks");
    if (cracks) { ctx.labour(P, "render_crack_repair", cracks, `${fmt(cracks)} m`); ctx.material(P, "render_sc_mix", qty2(cracks * 0.15), `${fmt(cracks)} m × 0.15 m wide`, "Repair mortar"); did.push(`repair ${fmt(cracks)} m of cracks and blown patches`); }
    const services = sys === "PAINT_ONLY" ? 0 : num(v, "services");
    if (services) { ctx.labour(P, "ewi_services", services, `${services} item${services > 1 ? "s" : ""}`); did.push(`take off and re-fix ${services} downpipe${services > 1 ? "s" : ""} / fittings`); }

    if (sys === "PAINT_ONLY") {
      ctx.material(F, "masonry_paint", ceil(A * 2 / 5 / 10), `${fmt(A)} m² × 2 coats ÷ 5 m²/L ÷ 10 L`);
      ctx.material(F, "biocide", ceil(A / 50), `${fmt(A)} m² ÷ 50 m²`, "Fungicidal wash before painting");
      ctx.labour(F, "masonry_paint_apply", A, `${fmt(A)} m²`);
      did.push(`fungicidal wash and two coats of masonry paint to ${fmt(A)} m²`);
    } else {
      // Beads: corners run full height; reveals ≈ 5 m per opening; base stop / bellcast bead.
      const beadM = qty2(corners * h + openings * 5 + base);
      if (ewi) {
        const board = str(v, "board");
        ctx.material(I, "ewi_starter_track", ceil(base / 2.5), `${fmt(base)} m base ÷ 2.5 m`);
        ctx.material(I, board, ceil(A * 1.05), `${fmt(A)} m² + 5% cutting`);
        ctx.material(I, "ewi_adhesive", A, `${fmt(A)} m²`);
        ctx.material(I, "ewi_fixings", A, `${fmt(A)} m² × 6 fixings`);
        ctx.labour(I, "ewi_boards", A, `${fmt(A)} m²`);
        const sills = num(v, "sills");
        if (sills) { ctx.material(I, "ewi_sill", sills, `${sills} window${sills > 1 ? "s" : ""}`); ctx.labour(I, "ewi_sill_fit", sills, `${sills} sills`); }
        did.push(`external wall insulation: ${ctx.rates.materials[board]?.name.replace("EWI board – ", "") ?? "insulation"} boards bonded and mechanically fixed${sills ? `, ${sills} extended sills` : ""}`);
      }
      ctx.material(R, "render_bead", ceil(beadM * 1.05 / 2.5), `corners ${corners} × ${fmt(h)} m + reveals ${openings} × 5 m + base ${fmt(base)} m = ${fmt(beadM)} m + 5% ÷ 2.5 m`);
      ctx.labour(R, "render_beads", beadM, `${fmt(beadM)} m of beads`);
      if (sys === "SAND_CEMENT") {
        ctx.material(R, "render_sc_mix", A, `${fmt(A)} m² at 20 mm`);
        ctx.labour(R, "render_sand_cement", A, `${fmt(A)} m²`);
        did.push(`sand & cement render, scratch and float coats (≈ 20 mm)`);
        if (bool(v, "masonryPaint")) {
          ctx.material(F, "masonry_paint", ceil(A * 2 / 5 / 10), `${fmt(A)} m² × 2 coats ÷ 5 m²/L ÷ 10 L`);
          ctx.labour(F, "masonry_paint_apply", A, `${fmt(A)} m²`);
          did.push("two coats of masonry paint");
        }
      } else if (THICK[sys]) {
        if (ewi) { ctx.material(R, "render_basecoat", A, `${fmt(A)} m²`); ctx.material(R, "render_mesh", qty2(A * 1.1), `${fmt(A)} m² + 10% laps`); ctx.labour(R, "render_thincoat", A, `${fmt(A)} m² base coat & mesh`, "Base coat & mesh on insulation"); }
        ctx.material(R, THICK[sys].key, A, `${fmt(A)} m²`);
        ctx.labour(R, "render_mono", A, `${fmt(A)} m²`);
        did.push(`${ewi ? "base coat with reinforcing mesh, then " : ""}${THICK[sys].label} through-colour render with a scraped finish`);
      } else {
        ctx.material(R, "render_basecoat", A, `${fmt(A)} m²`);
        ctx.material(R, "render_mesh", qty2(A * 1.1), `${fmt(A)} m² + 10% laps`);
        ctx.material(R, "render_primer", A, `${fmt(A)} m²`);
        const thin = THIN[sys] ?? THIN.SILICONE;
        ctx.material(R, thin.key, A, `${fmt(A)} m² at ${str(v, "texture")} mm`);
        ctx.labour(R, "render_thincoat", A, `${fmt(A)} m²`);
        did.push(`base coat with reinforcing mesh, primer and ${str(v, "texture")} mm ${thin.label} thin-coat render`);
      }
      did.push(`new beads to ${corners} corner${corners === 1 ? "" : "s"}, ${openings} opening${openings === 1 ? "" : "s"} and the base`);
    }

    const colour = str(v, "colour");
    ctx.scope(`External walls (${fmt(A)} m²${h > 2.7 ? ", from the scaffold" : ""}): ${did.join("; ")}${colour ? `. Colour: ${colour}` : ""}.`);
    if (ewi) {
      ctx.assume("External wall insulation is notified to Building Control; planning permission may be needed in a conservation area or where the front elevation changes noticeably.");
      ctx.assume("EWI price assumes walls are sound and reasonably flat; dubbing out over 20 mm, new roof-line extensions or moving gas meters are extra.");
    } else if (hack && A > 0) {
      ctx.assume("Re-rendering more than 25% of an external wall counts as renovating a thermal element (Approved Document L): Building Control may require insulation to U 0.30 where practical. EWI can be priced as an alternative.");
    }
    if (sys !== "PAINT_ONLY") ctx.assume("Render is not applied below 5 °C, in frost or in rain; the programme allows for weather.");
  },
};
