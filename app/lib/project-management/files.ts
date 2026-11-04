import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { ManagementError } from "./schema";
import type { Upload } from "./service";
export async function prepareAsset(id: string, kind: "PHOTO" | "DOCUMENT", filename: string, mimeType: string, bytes: Uint8Array): Promise<Upload> {
  if (!bytes.byteLength || bytes.byteLength > 12 * 1024 * 1024) throw new ManagementError("Files must be between 1 byte and 12 MB.");
  let content: Uint8Array = bytes;
  let name = filename.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 150) || "document";
  if (kind === "PHOTO") {
    try { const decoder = sharp(bytes, { limitInputPixels: 40000000, animated: false }); const metadata = await decoder.metadata(); if (!["jpeg", "png", "webp", "avif"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image"); content = await decoder.rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(); }
    catch { throw new ManagementError("Choose a valid, single-frame JPEG, PNG, WebP or AVIF photo below 40 megapixels."); }
    mimeType = "image/webp"; name = `${name.replace(/\.[^.]+$/, "")}.webp`;
  } else {
    if (mimeType === "application/pdf") { if (Buffer.from(bytes.slice(0, 5)).toString() !== "%PDF-") throw new ManagementError("The document is not a PDF."); }
    else if (mimeType === "text/plain") { try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); if (bytes.includes(0)) throw new Error("Binary"); } catch { throw new ManagementError("Choose a UTF-8 text document."); } }
    else throw new ManagementError("Documents must be PDF or plain text.");
  }
  return { id, kind, filename: name, mimeType, content, sha256: createHash("sha256").update(content).digest("hex") };
}
