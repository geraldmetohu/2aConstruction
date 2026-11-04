import { z } from "zod";
const uploadedFile = z.object({ name: z.string(), url: z.string().url().optional(), ufsUrl: z.string().url().optional(), type: z.string().optional() });
export function normalizeUploadedFile(value: unknown) {
  const file = uploadedFile.parse(value), url = file.url ?? file.ufsUrl;
  if (!url) throw new Error("The upload did not return a file URL.");
  return { name: file.name, url, type: file.type };
}
