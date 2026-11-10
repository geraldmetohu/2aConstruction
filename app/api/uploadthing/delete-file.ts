"use server";
import { UploadThingError, UTApi } from "uploadthing/server";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";

/**
 * Remove an uploaded file from UploadThing (admins only). A server action, so the admin forms can call it
 * from the browser without pulling server code (sign-in, database) into the browser bundle.
 */
export async function deleteFile(url: string) {
  await requireCatalogueAdmin();
  try {
    const parsed = new URL(url);
    const key = parsed.pathname.startsWith("/f/") ? parsed.pathname.slice(3) : url.split("/f/")[1];
    if (!key) throw new UploadThingError("Invalid file URL");
    await new UTApi().deleteFiles(key);
    return { success: true };
  } catch (err) {
    console.error("Delete failed:", err);
    throw new UploadThingError(err instanceof Error ? err.message : "Delete failed");
  }
}
