import { bool, num, type WorkPackage } from "../package";
import { fmt, qty2 } from "../util";

const ceil = (x: number) => Math.ceil(x - 1e-9);

/** Exterior cleaning: windows, jet washing, roofs, gutters, soft washing and decking. Quantities start at 0. */
export const cleaningPackage: WorkPackage = {
  id: "cleaning", label: "Exterior cleaning", short: "Cleaning",
  description: "Window cleaning, jet washing patios and drives, roof moss removal, gutter clearing, soft washing render and cleaning fascias and decking.",
  fields: [
    { key: "windows", label: "Windows to clean", type: "int", default: 0, min: 0, max: 200, public: true, group: "Windows" },
    { key: "inside", label: "Inside as well as outside", type: "boolean", default: false, group: "Windows", when: [{ key: "windows", gt: 0 }] },
    { key: "visits", label: "Visits", type: "int", default: 1, min: 1, max: 52, group: "Windows", hint: "e.g. 12 for monthly for a year", when: [{ key: "windows", gt: 0 }] },
    { key: "contract", label: "Regular contract – 10% off repeat visits", type: "boolean", default: true, group: "Windows", when: [{ key: "visits", gt: 1 }] },
    { key: "solar", label: "Solar panels to clean", type: "int", default: 0, min: 0, max: 100, group: "Windows" },
    { key: "conservatory", label: "Conservatory roof", type: "number", unit: "m²", default: 0, min: 0, max: 200, group: "Windows" },

    { key: "jetWash", label: "Jet wash patio / drive / paths", type: "number", unit: "m²", default: 0, min: 0, max: 5000, public: true, group: "Hard surfaces" },
    { key: "resand", label: "Re-sand the joints", type: "boolean", default: true, group: "Hard surfaces", when: [{ key: "jetWash", gt: 0 }] },
    { key: "seal", label: "Seal after cleaning", type: "boolean", default: false, group: "Hard surfaces", when: [{ key: "jetWash", gt: 0 }] },
    { key: "deck", label: "Clean & oil decking", type: "number", unit: "m²", default: 0, min: 0, max: 1000, group: "Hard surfaces" },

    { key: "roof", label: "Roof moss removal & biocide", type: "number", unit: "m²", default: 0, min: 0, max: 2000, public: true, group: "Roof & walls" },
    { key: "gutters", label: "Gutters to clear", type: "number", unit: "m", default: 0, min: 0, max: 1000, public: true, group: "Roof & walls" },
    { key: "fascias", label: "Fascias, soffits & gutters to wash (outside)", type: "number", unit: "m", default: 0, min: 0, max: 1000, group: "Roof & walls" },
    { key: "softwash", label: "Soft wash render / brick / cladding", type: "number", unit: "m²", default: 0, min: 0, max: 3000, group: "Roof & walls" },
    { key: "graffiti", label: "Graffiti to remove", type: "number", unit: "m²", default: 0, min: 0, max: 500, group: "Roof & walls" },
    { key: "platform", label: "Access platform needed", type: "boolean", default: false, group: "Roof & walls", hint: "Three storeys or no safe ladder / pole access" },
  ],
  needsScaffold: () => false,
  build(ctx, v) {
    const S = "Cleaning", did: string[] = [];
    const w = num(v, "windows"), visits = num(v, "visits"), inside = bool(v, "inside");
    if (w) {
      const repeat = visits > 1 && bool(v, "contract") ? 0.9 : 1;
      const q = Math.round(w * (inside ? 2 : 1) * (1 + (visits - 1) * repeat) * 100) / 100;
      ctx.labour(S, "window_clean", q, `${w} windows${inside ? " × 2 faces" : ""} × (1 + ${visits - 1} repeat visit${visits - 1 === 1 ? "" : "s"}${repeat < 1 ? " × 90% contract rate" : ""})`);
      did.push(`clean ${w} windows${inside ? " inside and out" : ""} with frames and sills${visits > 1 ? `, ${visits} visits` : ""}`);
    }
    const jet = num(v, "jetWash");
    if (jet) {
      ctx.labour(S, "jet_wash", jet, `${fmt(jet)} m²`);
      ctx.material(S, "biocide", ceil(jet / 50), `${fmt(jet)} m² ÷ 50 m²`, "Biocide pre-treatment");
      if (bool(v, "resand")) { ctx.material(S, "kiln_sand", ceil(jet / 10), `${fmt(jet)} m² ÷ 10 m² per bag`); ctx.labour(S, "jet_wash_resand", jet, `${fmt(jet)} m²`); }
      if (bool(v, "seal")) ctx.material(S, "patio_sealer", ceil(jet / 25), `${fmt(jet)} m² ÷ 25 m² per 5 L`);
      did.push(`jet wash ${fmt(jet)} m² of patio / drive with biocide${bool(v, "resand") ? ", re-sand the joints" : ""}${bool(v, "seal") ? " and seal" : ""}`);
    }
    const deck = num(v, "deck");
    if (deck) { ctx.labour(S, "deck_clean", deck, `${fmt(deck)} m²`); ctx.material(S, "deck_oil", ceil(deck / 25), `${fmt(deck)} m² ÷ 25 m²`); did.push(`clean and oil ${fmt(deck)} m² of decking`); }
    const solar = num(v, "solar"), cons = num(v, "conservatory"), graf = num(v, "graffiti");
    if (solar) { ctx.labour(S, "solar_clean", solar, `${solar} panels`); did.push(`clean ${solar} solar panels`); }
    if (cons) { ctx.labour(S, "conservatory_clean", cons, `${fmt(cons)} m²`); did.push(`clean ${fmt(cons)} m² of conservatory roof and frames`); }
    if (graf) { ctx.labour(S, "graffiti_remove", graf, `${fmt(graf)} m²`); ctx.material(S, "graffiti_remover", ceil(graf / 10), `${fmt(graf)} m² ÷ 10 m²`); did.push(`remove ${fmt(graf)} m² of graffiti`); }
    const roof = num(v, "roof"), soft = num(v, "softwash");
    if (roof) { ctx.labour(S, "roof_moss_clean", roof, `${fmt(roof)} m²`); did.push(`remove moss from ${fmt(roof)} m² of roof and treat with biocide`); }
    if (soft) { ctx.labour(S, "softwash", soft, `${fmt(soft)} m²`); did.push(`soft wash ${fmt(soft)} m² of walls`); }
    if (roof + soft) ctx.material(S, "biocide", ceil((roof + soft) / 50), `${fmt(qty2(roof + soft))} m² ÷ 50 m²`);
    const gut = num(v, "gutters"), fas = num(v, "fascias");
    if (gut) { ctx.labour(S, "gutter_clean", gut, `${fmt(gut)} m`); did.push(`clear ${fmt(gut)} m of gutters and flush the downpipes`); }
    if (fas) { ctx.labour(S, "upvc_clean", fas, `${fmt(fas)} m`); did.push(`wash ${fmt(fas)} m of fascias, soffits and gutters`); }
    if (bool(v, "platform")) {
      const days = Math.max(1, ceil((roof / 50 + soft / 80 + gut / 80 + fas / 80) / 2));
      ctx.material(S, "access_platform", days, `${days} day${days > 1 ? "s" : ""}`);
    }
    if (did.length) ctx.scope(`Exterior cleaning: ${did.join("; ")}.`);
    else ctx.warn("Exterior cleaning is switched on but nothing is measured yet.");
    if (roof) ctx.assume("Roof cleaning does not include tile replacement; any broken tiles found are reported with a price before repair.");
  },
};
