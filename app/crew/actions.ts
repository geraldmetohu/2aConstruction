"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, jobsAvailable } from "@/app/lib/takeoff/jobs.server";
import { checkIn, workerByToken } from "@/app/lib/takeoff/jobs-store";
import { StoreError } from "@/app/lib/takeoff/store";
import { hashCrewToken } from "@/app/lib/takeoff/crew-token.server";

/** Workers check in / out with their personal link (no account needed). */
export async function crewCheckIn(token: string, quoteId: string, kind: "IN" | "OUT", geo: { lat?: number; lng?: number; accuracy?: number }) {
  try {
    if (!(await jobsAvailable())) throw new StoreError("Check-in is not available yet.");
    const w = await workerByToken(db(), hashCrewToken(z.string().min(20).max(100).parse(token)));
    if (!w) throw new StoreError("This link is no longer valid. Ask the office for a new one.");
    const g = z.object({ lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional(), accuracy: z.number().min(0).max(100000).optional() }).parse(geo ?? {});
    await checkIn(db(), w.id, z.string().uuid().parse(quoteId), z.enum(["IN", "OUT"]).parse(kind), g, "WORKER");
    revalidatePath(`/crew/${token}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, message: e instanceof StoreError ? e.message : "Could not save. Check your signal and try again." };
  }
}
