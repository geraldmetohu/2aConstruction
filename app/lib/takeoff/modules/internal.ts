import { bool, num, str, type WorkPackage } from "../package";
import { fmt } from "../util";

const stairOptions: [string, string][] = [["NONE", "No stair work"], ["REFURB", "Refurbish (handrail, spindles, newels)"], ["REPLACE", "New straight staircase"], ["REPLACE_WINDER", "New winder / turned staircase"]];
const alarmOptions: [string, string][] = [["NONE", "None"], ["LD2", "Mains interlinked alarms (house, LD2)"], ["GRADE_A", "Grade A system with panel (HMO / flats)"]];

/** Internal alterations: stairs, partitions, new doorways, fire safety and sound insulation. */
export const internalPackage: WorkPackage = {
  id: "internal", label: "Stairs, layout & fire safety", short: "Alterations",
  description: "New or refurbished staircases, stud partitions, new doorways, FD30S fire doors, fire alarm systems (LD2 or Grade A for HMOs), emergency lighting, fire stopping and acoustic upgrades to party walls.",
  fields: [
    { key: "stairs", label: "Staircase", type: "select", default: "NONE", options: stairOptions, public: true, group: "Staircase" },
    { key: "oak", label: "Oak staircase with glass / oak balustrade", type: "boolean", default: false, clientChoice: true, group: "Staircase", when: [{ key: "stairs", in: ["REPLACE", "REPLACE_WINDER"] }] },

    { key: "partitions", label: "New stud partitions (wall area)", type: "number", unit: "m²", default: 0, min: 0, max: 300, public: true, group: "Layout" },
    { key: "doorways", label: "New doorways in existing walls", type: "int", default: 0, min: 0, max: 12, group: "Layout", hint: "Load-bearing walls need a steel – use Demolition for those" },
    { key: "acoustic", label: "Acoustic upgrade to party wall", type: "number", unit: "m²", default: 0, min: 0, max: 200, group: "Layout" },

    { key: "fireDoors", label: "FD30S fire door sets", type: "int", default: 0, min: 0, max: 40, public: true, group: "Fire safety" },
    { key: "alarm", label: "Fire alarm", type: "select", default: "NONE", options: alarmOptions, public: true, group: "Fire safety" },
    { key: "devices", label: "Detectors / call points / sounders", type: "int", default: 6, min: 1, max: 80, group: "Fire safety", when: [{ key: "alarm", not: "NONE" }] },
    { key: "emergency", label: "Emergency lights", type: "int", default: 0, min: 0, max: 40, group: "Fire safety" },
    { key: "fireStopping", label: "Fire-stopping to service penetrations", type: "int", default: 0, min: 0, max: 200, group: "Fire safety" },
  ],
  needsScaffold: () => false,
  skips: v => num(v, "partitions") > 20 || str(v, "stairs").startsWith("REPLACE") ? 1 : 0,
  build(ctx, v) {
    const st = str(v, "stairs");
    if (st !== "NONE") {
      const S = "Staircase";
      if (st === "REFURB") {
        ctx.labour(S, "staircase_refurb", 1, "1 staircase"); ctx.material(S, "balustrade_kit", 1, "1 set");
        ctx.scope("Staircase: refurbish the staircase with a new handrail, spindles and newel caps, compliant 99 mm gaps, ready to paint.", S);
      } else {
        const winder = st === "REPLACE_WINDER", oak = bool(v, "oak");
        ctx.labour(S, winder ? "staircase_winder_replace" : "staircase_replace", 1, "1 staircase");
        ctx.material(S, `staircase_kit_${oak ? "oak_" : ""}${winder ? "winder" : "straight"}`, 1, "1 staircase");
        ctx.scope(`Staircase: remove the old staircase and fit a new ${oak ? "oak " : ""}${winder ? "winder" : "straight"} staircase made to measure with ${oak ? "glass / oak" : "softwood"} balustrade, meeting Part K (rise, going, headroom and guarding); trims and plaster made good.`, S);
        ctx.assume("The staircase is made to measure after a site survey; the stairs are out of use for 1–2 days while it is changed, with temporary access arranged.");
      }
    }
    const pa = num(v, "partitions"), dw = num(v, "doorways"), ac = num(v, "acoustic");
    if (pa || dw || ac) {
      const S = "Layout", p: string[] = [];
      if (pa) { ctx.labour(S, "partition_build", pa, `${fmt(pa)} m²`); ctx.material(S, "partition_materials", pa, `${fmt(pa)} m²`); p.push(`build ${fmt(pa)} m² of insulated stud partition, boarded and skimmed both sides`); }
      if (dw) { ctx.labour(S, "doorway_form", dw, `${dw} doorways`); ctx.material(S, "door_lining_kit", dw, `${dw} doorways`); p.push(`form ${dw} new doorway${dw === 1 ? "" : "s"} in non-load-bearing walls with lintel, lining and architrave`); }
      if (ac) { ctx.labour(S, "acoustic_wall", ac, `${fmt(ac)} m²`); ctx.material(S, "acoustic_materials", ac, `${fmt(ac)} m²`); p.push(`upgrade ${fmt(ac)} m² of party wall for sound with resilient bars, acoustic wool and two layers of acoustic board`); }
      ctx.scope(`Layout: ${p.join("; ")}.`, S);
    }
    const fd = num(v, "fireDoors"), al = str(v, "alarm"), em = num(v, "emergency"), fs = num(v, "fireStopping");
    if (fd || al !== "NONE" || em || fs) {
      const S = "Fire safety", p: string[] = [];
      if (fd) { ctx.labour(S, "fire_door_fit", fd, `${fd} doors`); ctx.material(S, "fire_door_set", fd, `${fd} door sets`); p.push(`hang ${fd} FD30S fire door set${fd === 1 ? "" : "s"} with self-closers, intumescent strips, smoke seals and signage`); }
      if (al === "LD2") { const d = num(v, "devices"); ctx.labour(S, "fire_alarm_ld2", d, `${d} detectors`); ctx.material(S, "smoke_detector_mains", d, `${d} detectors`); p.push(`a mains-powered interlinked smoke and heat alarm system (Grade D1, LD2) with ${d} detectors`); }
      if (al === "GRADE_A") { const d = num(v, "devices"); ctx.labour(S, "fire_alarm_grade_a", d, `${d} devices`); ctx.material(S, "fire_panel", 1, "1 panel"); ctx.material(S, "fire_device", d, `${d} devices`); p.push(`a Grade A fire alarm system to BS 5839-6 with a control panel and ${d} detectors, call points and sounders`); }
      if (em) { ctx.labour(S, "emergency_light_fit", em, `${em} lights`); ctx.material(S, "emergency_light", em, `${em} lights`); p.push(`${em} three-hour emergency light${em === 1 ? "" : "s"} on the escape route`); }
      if (fs) { ctx.labour(S, "fire_stopping", fs, `${fs} penetrations`); ctx.material(S, "fire_stop_kit", fs, `${fs} penetrations`); p.push(`fire-stop ${fs} service penetration${fs === 1 ? "" : "s"} with intumescent sealant, collars and batts`); }
      ctx.scope(`Fire safety: ${p.join("; ")}. Commissioning and test certificates issued.`, S);
      if (al === "GRADE_A") ctx.assume("A Grade A system needs a fire risk assessment for the building; the layout of devices follows that assessment.");
    }
    if (st === "NONE" && !pa && !dw && !ac && !fd && al === "NONE" && !em && !fs) ctx.warn("Stairs, layout & fire safety is switched on but nothing is chosen yet.");
  },
};
