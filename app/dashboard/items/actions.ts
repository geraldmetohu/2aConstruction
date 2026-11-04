"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/db";
import { CatalogueError, requireCatalogueAdmin, requireCatalogueEnabled } from "@/app/lib/catalogue/access";
import { catalogueService } from "@/app/lib/catalogue/service";
import * as v from "@/app/lib/catalogue/validation";

const service = catalogueService(prisma);
async function perform<T extends z.ZodTypeAny>(form: FormData, schema: T, work: (actor: string, data: z.output<T>) => Promise<string>, message: string): Promise<v.ActionResult> {
  try {
    // Authenticate before parsing input or making any catalogue query.
    const actor = await requireCatalogueAdmin();
    requireCatalogueEnabled();
    let values;
    try { values = v.formValues(form); } catch { throw new CatalogueError("The form could not be read. Please reload and try again."); }
    const parsed = schema.safeParse(values);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
    const id = await work(actor, parsed.data);
    revalidatePath("/dashboard/items", "layout");
    return { ok: true, message, id };
  } catch (error) {
    if (error instanceof CatalogueError) return { ok: false, message: error.message };
    const detail = error instanceof Error ? error.message : "";
    if (detail.includes("Supporting items must not contain cycles")) return { ok: false, message: "These supporting items would create a circular dependency. Remove the circular link before publishing." };
    if (detail.includes("Category hierarchy must not contain cycles")) return { ok: false, message: "That parent category would create a circular hierarchy. Choose a different parent." };
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
    if (code === "P2002") return { ok: false, message: "That code or effective date already exists. Choose a different one." };
    if (code === "P2034") return { ok: false, message: "Another save happened at the same time. Reload and try again." };
    if (code === "P2021" || code === "P2022") return { ok: false, message: "The item catalogue needs its database setup completed before saving." };
    if (["P2003", "P2004", "P2010"].includes(code)) return { ok: false, message: "This change could not be saved. Check for unavailable entries, a supporting-item cycle, or a published version that cannot be changed." };
    console.error("Catalogue operation failed", { code }); // Never log payloads or credentials.
    return { ok: false, message: "The change could not be saved. Your previous records have been kept. Please reload and try again." };
  }
}

export async function saveItem(form: FormData) { return perform(form, v.itemSchema, service.saveItem, "Item saved."); }
export async function changeItemStatus(form: FormData) { return perform(form, v.statusSchema, service.status, "Item availability updated."); }
export async function duplicateItem(form: FormData) { return perform(form, v.duplicateSchema, service.duplicate, "Copy created as inactive. Review it before activating."); }
export async function addPrice(form: FormData) { return perform(form, v.priceSchema, service.price, "New price version saved. Previous prices are preserved."); }
export async function publishRecipe(form: FormData) { return perform(form, v.recipeSchema, service.recipe, "New work specification published. Previous versions are preserved."); }
export async function saveOption(form: FormData) { return perform(form, v.optionSchema, service.option, "Option version saved."); }
export async function changeOptionStatus(form: FormData) { return perform(form, v.optionStatusSchema, service.optionStatus, "Option availability updated."); }
export async function addSupplierReference(form: FormData) { return perform(form, v.referenceSchema, service.reference, "Supplier reference recorded."); }
export async function saveLookup(form: FormData) { return perform(form, v.lookupSchema, service.lookup, "Catalogue entry saved."); }
export async function changeLookupStatus(form: FormData) { return perform(form, v.lookupStatusSchema, service.lookupStatus, "Catalogue entry availability updated."); }
export async function addRate(form: FormData) { return perform(form, v.rateSchema, service.rate, "New rate saved. Previous rates are preserved."); }
