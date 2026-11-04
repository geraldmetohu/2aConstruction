import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireManagementAdmin } from "@/app/lib/project-management/access";
import { commandSchema, ManagementError } from "@/app/lib/project-management/schema";
import { managementService } from "@/app/lib/project-management/service";
import { prepareAsset } from "@/app/lib/project-management/files";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const actor = await requireManagementAdmin();
    if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ ok: false, message: "Upload must originate from this application." }, { status: 403 });
    // Count the actual stream; Content-Length alone is not trusted.
    const reader = request.body?.getReader(); if (!reader) throw new ManagementError("Choose a file.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 13 * 1024 * 1024) { await reader.cancel(); throw new ManagementError("Upload exceeds 13 MB including form fields."); } chunks.push(value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
    const raw = String(form.get("command") ?? ""); if (raw.length > 100000) throw new ManagementError("File details are too long.");
    const command = commandSchema.parse(JSON.parse(raw));
    if (command.kind !== "PHOTO" && command.kind !== "DOCUMENT") throw new ManagementError("Choose a photo or document.");
    const file = form.get("file"); if (!file || typeof file === "string") throw new ManagementError("Choose a file.");
    const upload = await prepareAsset(command.entityId, command.kind, file.name, file.type, new Uint8Array(await file.arrayBuffer()));
    const sequence = await managementService(prisma).record(command, actor, upload);
    return Response.json({ ok: true, sequence }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return Response.json({ ok: false, message: e instanceof ManagementError ? e.message : e instanceof z.ZodError ? "Check the file details and change reason." : "Unable to attach the file. Reload before retrying." }, { status: 400 }); }
}
