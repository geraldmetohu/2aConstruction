import { z } from "zod";

export const workLabels = { doors: "Internal doors", flooring: "Floor finishes", painting: "Wall painting", electrical: "Electrical points", plumbing: "Plumbing fixtures", windows: "Windows", plastering: "Wall plastering", roof: "Roof covering", insulation: "Insulation", groundworks: "Groundworks", structure: "Building structure", landscaping: "Patio / landscaping" } as const;
export const workCodes = ["doors", "flooring", "painting", "electrical", "plumbing", "windows", "plastering", "roof", "insulation", "groundworks", "structure", "landscaping"] as const;
export const projectLabels = { refurbishment: "House renovation", extension: "Extension", loft: "Loft conversion", new: "New build", bathroom: "Bathroom", kitchen: "Kitchen", roof: "Roof", groundworks: "Groundworks", garden: "Patio / garden", repair: "Repairs", other: "Other" } as const;
export const projectCodes = ["refurbishment", "extension", "loft", "new", "bathroom", "kitchen", "roof", "groundworks", "garden", "repair", "other"] as const;
export const measuredWork = { roof: "Roof area (m²)", insulation: "Insulation area (m²)", groundworks: "Groundworks volume (m³)", structure: "Structure floor area (m²)", landscaping: "Patio / landscaping area (m²)" } as const;
const dimension = z.string().regex(/^\d{1,3}(?:\.\d{1,3})?$/).refine(v => Number(v) > 0 && Number(v) <= 100, "Use a measurement between 0 and 100 metres.");
const measurement = z.union([dimension, z.literal("")]);
export const workSchema = z.object({
  code: z.enum(workCodes), specification: z.enum(["standard", "upgrade", "unsure"]),
  supply: z.enum(["contractor", "client", "existing", "unsure"]),
  condition: z.enum(["new", "refurbishment", "repair", "unsure"]),
  inclusion: z.enum(["included", "optional"]),
  quantity: z.string().regex(/^\d{1,4}$/).refine(v => Number(v) >= 1 && Number(v) <= 1000).or(z.literal("")),
  measure: z.string().regex(/^\d{1,5}(?:\.\d{1,3})?$/).refine(v => Number(v) > 0).or(z.literal("")).default(""),
  roofType: z.enum(["pitched", "flat", "mixed", "unsure"]).default("unsure"),
  roofCovering: z.enum(["concrete", "clay", "slate", "membrane", "other", "unsure"]).default("unsure"),
  roofWindows: z.string().regex(/^\d{1,3}$/).or(z.literal("")).default(""),
  roofInsulation: z.enum(["yes", "no", "unsure"]).default("unsure"),
  guttering: z.enum(["yes", "no", "unsure"]).default("unsure"),
}).strict();
export const roomSchema = z.object({
  key: z.string().uuid(), name: z.string().trim().min(1, "Name this room or area.").max(80),
  length: measurement, width: measurement, height: measurement,
  openings: z.string().regex(/^\d{1,4}(?:\.\d{1,3})?$/).or(z.literal("")),
  works: z.array(workSchema).min(1, "Choose at least one type of work.").max(12),
}).strict().superRefine((room, ctx) => {
  if (new Set(room.works.map(w => w.code)).size !== room.works.length) ctx.addIssue({ code: "custom", message: "Choose each type of work once." });
  if (room.works.some(w => ["painting", "plastering"].includes(w.code)) && room.length && room.width && room.height && room.openings && Number(room.openings) >= 2 * (Number(room.length) + Number(room.width)) * Number(room.height)) ctx.addIssue({ code: "custom", path: ["openings"], message: "Openings must be smaller than the total wall area." });
});
export const requirementsSchema = z.object({
  project: z.enum(projectCodes),
  property: z.object({ type: z.enum(["house", "flat", "commercial", "other", "unsure"]), floors: z.string().regex(/^\d{1,2}$/).or(z.literal("")), area: z.string().regex(/^\d{1,5}(?:\.\d{1,2})?$/).or(z.literal("")), bedrooms: z.string().regex(/^\d{1,2}$/).or(z.literal("")), bathrooms: z.string().regex(/^\d{1,2}$/).or(z.literal("")) }).strict().default({ type: "unsure", floors: "", area: "", bedrooms: "", bathrooms: "" }),
  postcode: z.string().trim().min(3, "Enter your postcode.").max(12),
  rooms: z.array(roomSchema).min(1).max(10),
  contact: z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200), phone: z.string().trim().max(40) }).strict(),
  specialRequests: z.string().trim().max(4000),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm the estimate scope and £50 fee." }) }),
}).strict().superRefine((r, ctx) => {
  if (new Set(r.rooms.map(room => room.key)).size !== r.rooms.length) ctx.addIssue({ code: "custom", message: "Room identities must be unique." });
});
export type Work = z.infer<typeof workSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Requirements = z.infer<typeof requirementsSchema>;
export type Draft = Omit<Requirements, "consent"> & { consent: boolean };
export function newRoom(key: string): Room { return { key, name: "", length: "", width: "", height: "", openings: "", works: [] }; }
export function newDraft(key: string): Draft { return { project: "refurbishment", property: { type: "unsure", floors: "", area: "", bedrooms: "", bathrooms: "" }, postcode: "", rooms: [newRoom(key)], contact: { name: "", email: "", phone: "" }, specialRequests: "", consent: false }; }
export function newWork(code: Work["code"], project: Draft["project"]): Work { return workSchema.parse({ code, specification: "standard", supply: "contractor", condition: ["new", "extension", "loft"].includes(project) ? "new" : project === "repair" ? "repair" : "refurbishment", inclusion: "included", quantity: "" }); }
export function uncertainty(room: Room, work: Work) {
  const reasons: string[] = [];
  if (work.specification === "unsure") reasons.push("Specification to confirm");
  if (work.supply === "unsure") reasons.push("Material supply to confirm");
  if (work.condition === "unsure") reasons.push("Existing condition to confirm");
  if (["flooring", "painting", "plastering"].includes(work.code) && (!room.length || !room.width)) reasons.push("Room measurements to confirm");
  if (["painting", "plastering"].includes(work.code) && (!room.height || room.openings === "")) reasons.push("Wall height or openings to confirm");
  if (work.code in measuredWork && !work.measure) reasons.push("Measured quantity to confirm");
  if (!["flooring", "painting", "plastering"].includes(work.code) && !(work.code in measuredWork) && !work.quantity) reasons.push("Quantity to confirm");
  if (work.code === "roof" && (work.roofType === "unsure" || work.roofType === "mixed" || work.roofCovering === "unsure" || work.roofCovering === "other")) reasons.push("Roof type or covering needs review");
  return reasons;
}
