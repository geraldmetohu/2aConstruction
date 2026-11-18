import { NextResponse } from "next/server";
import { UTApi, UTFile } from "uploadthing/server";
import { z } from "zod";
import { db, jobsAvailable } from "@/app/lib/takeoff/jobs.server";
import { addPhotos, listAssignments, workerByToken } from "@/app/lib/takeoff/jobs-store";
import { hashCrewToken } from "@/app/lib/takeoff/crew-token.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * A photo from the site team's check-in link (no account). The phone shrinks it first (about 1600 px), so it
 * fits easily. It goes into the job's photos for the office – NOT shown to the client until the office shares it.
 */
export async function POST(req: Request) {
  try {
    if (!(await jobsAvailable())) return NextResponse.json({ ok: false, message: "Not available yet." }, { status: 503 });
    const form = await req.formData();
    const token = z.string().min(20).max(100).parse(form.get("token"));
    const quoteId = z.string().uuid().parse(form.get("quoteId"));
    const caption = z.string().trim().max(200).parse(form.get("caption") ?? "");
    const file = form.get("file");
    if (!(file instanceof Blob) || !file.size) return NextResponse.json({ ok: false, message: "No photo." }, { status: 400 });
    if (file.size > 4_000_000 || !/^image\/(jpeg|png|webp)$/.test(file.type)) return NextResponse.json({ ok: false, message: "Photos only, up to 4 MB." }, { status: 400 });
    const d = db();
    const w = await workerByToken(d, hashCrewToken(token));
    if (!w) return NextResponse.json({ ok: false, message: "This link is no longer valid." }, { status: 403 });
    const onJob = (await listAssignments(d, { workerId: w.id, activeOnly: true })).some(a => a.quoteId === quoteId);
    if (!onJob) return NextResponse.json({ ok: false, message: "You're not booked on that site." }, { status: 403 });
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const name = `site-${quoteId.slice(0, 8)}-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
    const up = await new UTApi().uploadFiles(new UTFile([await file.arrayBuffer()], name, { type: file.type }));
    const url = up.data ? ((up.data as { ufsUrl?: string; url?: string }).ufsUrl ?? (up.data as { url?: string }).url) : undefined;
    if (!url) return NextResponse.json({ ok: false, message: "Upload failed – it will try again." }, { status: 502 });
    await addPhotos(d, quoteId, [{ url, caption: caption || `From site – ${w.name}`, stage: "" }], `crew:${w.name}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
    console.error("[crew photo]", e);
    return NextResponse.json({ ok: false, message: "Upload failed – it will try again." }, { status: 500 });
  }
}
