import { bool, num, str, type Field, type WorkPackage } from "../package";
import { beamForSpan, beamSizes } from "../ratebook";
import { fmt, qty2 } from "../util";
import { bearingFields, bearingOptions, bearings } from "./common";

const ceil = (x: number) => Math.ceil(x - 1e-9);
const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
const m2 = (key: string, label: string, group: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "number", unit: "m²", default: 0, min: 0, max: 5000, group, ...extra });
const cnt = (key: string, label: string, group: string, max = 20, extra: Partial<Field> = {}): Field => ({ key, label, type: "int", default: 0, min: 0, max, group, ...extra });

/** Loose waste volume per unit (m³), used to size skips / grab loads. Demolition arisings bulk up by about 20%. */
const WASTE = {
  partition: 0.1, ceiling: 0.03, floor: 0.04, plaster: 0.02, kitchen: 3, bathroom: 2.5, wardrobe: 1, breast: 1.5, stack: 2,
  conservatory: 0.25, shedTimber: 0.2, shedBrick: 0.6, extension: 0.8, building: 0.7, foundations: 0.4, asbestos: 0,
};

/**
 * Demolition and strip-out on its own: soft strip, partitions, load-bearing walls (with steels), chimney breasts
 * and stacks, ceilings, floors, concrete, outbuildings, conservatories, extensions or a whole building.
 * Safety first: services isolated, asbestos survey, props and temporary works; waste sized from what comes out.
 */
export const demolitionPackage: WorkPackage = {
  id: "demolition", label: "Demolition & strip-out", short: "Demolition",
  description: "Strip-out and demolition only: kitchens, bathrooms, partitions, load-bearing walls with steels, chimney breasts and stacks, ceilings, floors, concrete, outbuildings, conservatories, extensions or a whole building – with surveys, propping and waste.",
  fields: [
    { key: "asbestosSurvey", label: "Asbestos refurbishment & demolition survey", type: "boolean", default: true, group: "Before we start", hint: "Required by law before demolition in buildings built before 2000" },
    { key: "isolate", label: "Isolate & cap off gas, electric & water", type: "boolean", default: true, group: "Before we start" },
    cnt("dustScreens", "Dust screens / zip walls", "Before we start", 20),
    { key: "hoarding", label: "Site hoarding", type: "number", unit: "m", default: 0, min: 0, max: 300, group: "Before we start" },

    cnt("kitchens", "Kitchens to strip out", "Strip-out", 5, { public: true }),
    cnt("bathrooms", "Bathrooms to strip out", "Strip-out", 5, { public: true }),
    cnt("wardrobes", "Fitted wardrobes / cupboards", "Strip-out", 20),
    m2("floorLift", "Floor coverings / timber floors to lift", "Strip-out"),
    m2("ceilings", "Ceilings to pull down", "Strip-out"),
    m2("plaster", "Plaster to hack off", "Strip-out"),
    m2("strip", "General soft strip (rooms cleared to bare walls)", "Strip-out"),

    m2("partitions", "Non-structural partitions (wall face area)", "Walls", { public: true }),
    cnt("loadBearing", "Load-bearing walls to open up / remove", "Walls", 6, { public: true, hint: "Each gets a steel beam on padstones, propped while it goes in" }),
    { key: "loadBearingWidth", label: "Average opening width", type: "number", unit: "m", default: 3, min: 0.8, max: 8, group: "Walls", when: [{ key: "loadBearing", gt: 0 }] },
    ...bearingFields("wallSteel", "Steels in the walls", "Walls", [{ key: "loadBearing", gt: 0 }]),

    cnt("chimneyBreasts", "Chimney breasts to remove (per floor)", "Chimneys", 8, { public: true }),
    { key: "breastSupport", label: "What holds up the chimney above", type: "select", default: "STEEL", group: "Chimneys", when: [{ key: "chimneyBreasts", gt: 0 }], options: [
      ["STEEL", "Steel beam on padstones (engineer's design)"], ["GALLOWS", "Gallows brackets (only where Building Control accepts)"], ["NONE", "Nothing – whole breast and stack removed"]] },
    { key: "breastBearing", label: "Chimney steels sit on", type: "select", default: "PADSTONE", options: bearingOptions, group: "Chimneys", when: [{ key: "chimneyBreasts", gt: 0 }, { key: "breastSupport", is: "STEEL" }] },
    cnt("stacks", "Chimney stacks to take down", "Chimneys", 4),

    m2("concrete", "Concrete / patio to break out", "Outside"),
    { key: "concreteThickness", label: "Concrete thickness", type: "select", default: "150", group: "Outside", options: [["100", "100 mm"], ["150", "150 mm"], ["200", "200 mm"], ["300", "300 mm (reinforced / old slab)"]], when: [{ key: "concrete", gt: 0 }] },
    m2("conservatory", "Conservatory to dismantle", "Outside", { public: true }),
    m2("shedTimber", "Timber shed / outbuilding", "Outside"),
    m2("shedBrick", "Brick garage / outbuilding", "Outside", { public: true }),
    m2("extension", "Single storey extension to demolish", "Outside", { public: true }),
    { key: "foundations", label: "Old foundations to grub out", type: "number", unit: "m", default: 0, min: 0, max: 300, group: "Outside" },

    m2("building", "Whole building (gross floor area)", "Whole building", { public: true, hint: "Detached / outbuilding demolition by machine" }),

    { key: "asbestosArea", label: "Non-licensed asbestos to remove (artex, floor tiles, cement sheet)", type: "number", unit: "m²", default: 0, min: 0, max: 2000, group: "Asbestos" },
    { key: "asbestosSum", label: "Licensed asbestos removal – provisional sum", type: "number", unit: "£", default: 0, min: 0, max: 100000, group: "Asbestos", hint: "From the specialist's quote after the survey" },

    { key: "waste", label: "Waste removal", type: "select", default: "SKIPS", group: "Waste", options: [["SKIPS", "Skips (8 yd ≈ 6 m³ of demolition waste)"], ["GRAB", "Grab lorry (≈ 8 m³ a load, needs road access)"], ["VAN", "Man & van loads (≈ 3 m³, tight streets)"]] },
  ],
  needsScaffold: v => Number(v.stacks) > 0,
  build(ctx, v) {
    const S0 = "Before we start", S1 = "Strip-out", S2 = "Structural", S3 = "Outside demolition", W = "Waste";
    const did: string[] = [];
    let waste = 0;
    const add = (vol: number) => { waste += vol; };

    // Before we start
    if (bool(v, "asbestosSurvey")) { ctx.material(S0, "asbestos_survey", 1, "R&D survey"); did.push("asbestos refurbishment & demolition survey before any work"); }
    if (bool(v, "isolate")) { ctx.labour(S0, "services_isolate", 1, "gas, electric & water"); did.push("isolate and cap off gas, electricity and water"); }
    const screens = num(v, "dustScreens");
    if (screens) { ctx.material(S0, "dust_screen", screens, n(screens, "screen")); ctx.labour(S0, "dust_screen_fit", screens, n(screens, "screen")); did.push(n(screens, "dust screen")); }
    const hoard = num(v, "hoarding");
    if (hoard) { ctx.material(S0, "hoarding", ceil(hoard), `${fmt(hoard)} m`); ctx.labour(S0, "hoarding_fit", hoard, `${fmt(hoard)} m`); did.push(`${fmt(hoard)} m of site hoarding`); }

    // Strip-out
    const k = num(v, "kitchens"), b = num(v, "bathrooms"), wr = num(v, "wardrobes");
    if (k) { ctx.labour(S1, "strip_kitchen", k, n(k, "kitchen")); add(k * WASTE.kitchen); }
    if (b) { ctx.labour(S1, "strip_bathroom", b, n(b, "bathroom")); add(b * WASTE.bathroom); }
    if (wr) { ctx.labour(S1, "strip_wardrobe", wr, n(wr, "wardrobe")); add(wr * WASTE.wardrobe); }
    const fl = num(v, "floorLift"), ce = num(v, "ceilings"), pl = num(v, "plaster"), st = num(v, "strip");
    if (fl) { ctx.labour(S1, "floor_lift", fl, `${fmt(fl)} m²`); add(fl * WASTE.floor); }
    if (ce) { ctx.labour(S1, "ceiling_pull_down", ce, `${fmt(ce)} m²`); add(ce * WASTE.ceiling); }
    if (pl) { ctx.labour(S1, "hack_off_plaster", pl, `${fmt(pl)} m²`); add(pl * WASTE.plaster); }
    if (st) { ctx.labour(S1, "strip_out", st, `${fmt(st)} m²`); add(st * 0.05); }
    const strip = [k && n(k, "kitchen"), b && n(b, "bathroom"), wr && n(wr, "fitted wardrobe"), fl && `${fmt(fl)} m² of floor coverings / boards`, ce && `${fmt(ce)} m² of ceilings`, pl && `${fmt(pl)} m² of plaster`, st && `${fmt(st)} m² general soft strip`].filter(Boolean);
    if (strip.length) did.push(`strip out ${strip.join(", ")}`);

    // Walls
    const part = num(v, "partitions");
    if (part) { ctx.labour(S2, "remove_partition", part, `${fmt(part)} m²`); add(part * WASTE.partition); did.push(`take down ${fmt(part)} m² of non-structural partitions`); }
    const lb = num(v, "loadBearing");
    if (lb) {
      const ow = num(v, "loadBearingWidth"), beam = beamSizes[beamForSpan(ow)];
      ctx.material(S2, beam.key, qty2(lb * (ow + 0.3)), `${lb} × (${fmt(ow)} m + 0.3 m bearings)`, `Steel beams – ${beam.label}`);
      const bText = bearings(ctx, S2, Array.from({ length: lb }, () => [str(v, "wallSteelEndA"), str(v, "wallSteelEndB")]).flat(), `${lb} steel${lb > 1 ? "s" : ""}`);
      ctx.material(S2, "beam_transport", 1, "1 delivery");
      ctx.material(S2, "intumescent", qty2(lb * (ow + 0.3)), `${fmt(lb * (ow + 0.3))} m`, "Fire protection to steel");
      ctx.material(S2, "props_hire", lb * 2, `${lb} opening${lb > 1 ? "s" : ""} × 2 weeks`);
      ctx.material(S2, "temp_works_design", 1, "propping design");
      ctx.labour(S2, "knock_through", qty2(lb * ow), `${lb} × ${fmt(ow)} m`);
      add(lb * ow * 2.5 * 0.25);
      did.push(`open up ${n(lb, "load-bearing wall")} (${fmt(ow)} m each) on temporary props with ${beam.label} steel on ${bText}, fire protected`);
      ctx.assume("Steel sizes are indicative until the structural engineer's calculations; Building Control is notified for all structural alterations.");
    }

    // Chimneys
    const cb = num(v, "chimneyBreasts"), sup = str(v, "breastSupport");
    if (cb) {
      ctx.labour(S2, "chimney_breast_remove", cb, n(cb, "breast"));
      if (sup === "GALLOWS") ctx.material(S2, "gallows_brackets", cb, n(cb, "pair"));
      if (sup === "STEEL") { const bm = beamSizes[beamForSpan(1.6)]; ctx.material(S2, bm.key, qty2(cb * 1.6), `${cb} × 1.6 m`, `Steel under the chimney – ${bm.label}`); bearings(ctx, S2, Array.from({ length: cb * 2 }, () => str(v, "breastBearing")), "chimney steels"); ctx.material(S2, "props_hire", cb, `${cb} week${cb > 1 ? "s" : ""}`); }
      add(cb * WASTE.breast);
      did.push(`remove ${n(cb, "chimney breast")}${sup === "STEEL" ? " with a steel beam supporting the chimney above" : sup === "GALLOWS" ? " on gallows brackets" : " (whole breast and stack)"}, making good floor, wall and ceiling`);
      ctx.assume("Chimney breast removal needs Building Control approval and, on a shared breast, a party wall notice; the flue of any neighbour must stay working.");
    }
    const stacks = num(v, "stacks");
    if (stacks) { ctx.labour(S2, "chimney_stack_remove", stacks, n(stacks, "stack")); ctx.material(S2, "batten_25x50", stacks * 6, "patch battens"); add(stacks * WASTE.stack); did.push(`take down ${n(stacks, "chimney stack")} below the roof line and tile over`); }

    // Outside
    const conc = num(v, "concrete"), t = Number(str(v, "concreteThickness")) / 1000;
    if (conc) { ctx.labour(S3, "break_out_concrete", qty2(conc * t / 0.15), `${fmt(conc)} m² × ${t * 1000} mm ÷ 150 mm standard`); add(conc * t * 1.4); did.push(`break out ${fmt(conc)} m² of ${t * 1000} mm concrete`); }
    const cons = num(v, "conservatory"); if (cons) { ctx.labour(S3, "demolish_conservatory", cons, `${fmt(cons)} m²`); add(cons * WASTE.conservatory); did.push(`dismantle a ${fmt(cons)} m² conservatory`); }
    const sht = num(v, "shedTimber"); if (sht) { ctx.labour(S3, "demolish_outbuilding_timber", sht, `${fmt(sht)} m²`); add(sht * WASTE.shedTimber); did.push(`demolish ${fmt(sht)} m² timber outbuilding`); }
    const shb = num(v, "shedBrick"); if (shb) { ctx.labour(S3, "demolish_outbuilding_brick", shb, `${fmt(shb)} m²`); add(shb * WASTE.shedBrick); did.push(`demolish ${fmt(shb)} m² brick garage / outbuilding`); }
    const ext = num(v, "extension"); if (ext) { ctx.labour(S3, "demolish_extension", ext, `${fmt(ext)} m²`); add(ext * WASTE.extension); did.push(`demolish a ${fmt(ext)} m² single storey extension and make good the house wall`); }
    const fd = num(v, "foundations"); if (fd) { ctx.labour(S3, "grub_foundations", fd, `${fmt(fd)} m`); add(fd * WASTE.foundations); did.push(`grub out ${fmt(fd)} m of old foundations`); }
    const bld = num(v, "building");
    if (bld) {
      ctx.labour(S3, "demolish_building", bld, `${fmt(bld)} m² floor area`); add(bld * WASTE.building);
      ctx.material(S0, "demolition_notice", 1, "6 weeks before");
      ctx.material(S0, "utility_disconnect", 1, "gas, electric, water & telecoms");
      did.push(`demolish the whole building (${fmt(bld)} m²) by machine, sort and recycle the arisings`);
      ctx.assume("Whole-building demolition: Section 80 notice to the council at least 6 weeks before; utilities disconnected by the providers; planning / prior approval where needed.");
    }

    // Asbestos
    const asb = num(v, "asbestosArea"), asbSum = num(v, "asbestosSum");
    if (asb) { ctx.labour("Asbestos", "asbestos_nonlicensed", asb, `${fmt(asb)} m²`); ctx.material("Asbestos", "asbestos_disposal", 1, "licensed carrier & consignment note"); did.push(`remove ${fmt(asb)} m² of non-licensed asbestos under controlled conditions`); }
    if (asbSum) { ctx.material("Asbestos", "asbestos_licensed", asbSum, `£${fmt(asbSum)} provisional`); did.push("licensed asbestos removal (provisional sum)"); ctx.assume("Licensed asbestos removal is a provisional sum adjusted to the specialist's account."); }
    if (!bool(v, "asbestosSurvey")) ctx.warn("No asbestos survey: one is required before demolition in buildings built before 2000.");

    // Waste: loose volume → skips / grab / van loads, plus loading (slower through the house).
    const loose = qty2(waste * 1.2);
    if (loose > 0) {
      const route = str(v, "waste");
      const per = route === "GRAB" ? 8 : route === "VAN" ? 3 : 6, loads = Math.max(1, ceil(loose / per));
      if (route === "GRAB") ctx.material(W, "muck_away", loads, `${fmt(loose)} m³ ÷ 8 m³`);
      else if (route === "VAN") ctx.labour(W, "rubbish_removal", loads, `${fmt(loose)} m³ ÷ 3 m³`, "Waste removal – man & van loads");
      else ctx.material(W, "skip_8yd", loads, `${fmt(loose)} m³ ÷ 6 m³ per skip`, "Skips for demolition waste (8 yd)");
      const slow = ctx.input.property.access !== "EASY" ? 1.5 : 1;
      ctx.labour(W, "load_spoil", qty2(loose * slow), `${fmt(loose)} m³${slow > 1 ? " × 1.5 (barrowed through the house)" : ""}`, "Barrow & load demolition waste");
      did.push(`remove about ${fmt(loose)} m³ of waste (${loads} ${route === "GRAB" ? "grab loads" : route === "VAN" ? "van loads" : "skips"}), recycling where possible`);
    }

    if (did.length) ctx.scope(`Demolition & strip-out: ${did.join("; ")}.`);
    else ctx.warn("Demolition is switched on but nothing is measured yet.");
    ctx.assume("Demolition is carried out top down, under a method statement, with the work area kept safe and neighbours protected from dust and noise.");
  },
};
