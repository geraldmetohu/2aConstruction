import "server-only";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { getDetail, getDetails, type ProjectDetail } from "./details-store";
import { cachedPublic } from "@/app/lib/storefront-query";

export const portfolioDb = () => prismaDb(prisma);

/** Write-up for one project, or null (also null if the new table is not there yet). */
export async function loadDetail(projectId: string): Promise<ProjectDetail | null> {
  try { return await getDetail(portfolioDb(), projectId); } catch (e) { console.warn("[portfolio] detail unavailable", (e as Error)?.message); return null; }
}

export async function loadDetails(projectIds: string[]): Promise<Map<string, ProjectDetail>> {
  try {
    // Cached with the rest of the public site (cleared when a project is saved).
    const key = `details:${[...projectIds].sort().join(",")}`;
    return new Map(await cachedPublic(key, async () => [...(await getDetails(portfolioDb(), projectIds)).entries()]));
  } catch (e) { console.warn("[portfolio] details unavailable", (e as Error)?.message); return new Map(); }
}
