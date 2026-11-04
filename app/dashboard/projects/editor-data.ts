import "server-only";
import { prisma } from "@/app/lib/db";
import { detailsReady, emptyDetail, getDetail, type ProjectDetail } from "@/app/lib/portfolio/details-store";
import { portfolioDb } from "@/app/lib/portfolio/details.server";
import { listFavouritePhotos } from "@/app/lib/takeoff/jobs-store";
import { jobsReady } from "@/app/lib/takeoff/jobs-store";
import type { PhotoSource } from "@/app/componets/dashboard/ProjectEditor";

/** Photos the admin can pull into a portfolio project: job favourites, then client portal projects. */
export async function photoSources(): Promise<PhotoSource[]> {
  const out: PhotoSource[] = [];
  const db = portfolioDb();
  try {
    if (await jobsReady(db)) {
      const favs = await listFavouritePhotos(db);
      const byJob = new Map<string, PhotoSource>();
      for (const f of favs) {
        const key = `job:${f.quoteId}`;
        if (!byJob.has(key)) byJob.set(key, { id: key, label: `★ Job favourites · ${f.reference}${f.siteAddress ? ` · ${f.siteAddress}` : ""}`, images: [] });
        byJob.get(key)!.images.push({ url: f.url, caption: f.caption });
      }
      out.push(...byJob.values());
    }
  } catch (e) { console.warn("[projects] job favourites unavailable", (e as Error)?.message); }
  try {
    const cps = await prisma.clientProject.findMany({ orderBy: { updatedAt: "desc" }, include: { client: true, phases: { orderBy: { phaseOrder: "asc" } } } });
    for (const cp of cps) {
      const imgs = cp.phases.flatMap(ph => ph.images).filter(Boolean);
      if (imgs.length) out.push({ id: `client:${cp.id}`, label: `Client portal · ${cp.client.fullName} · ${cp.projectType}`, images: imgs.map(url => ({ url })) });
    }
  } catch (e) { console.warn("[projects] client projects unavailable", (e as Error)?.message); }
  return out;
}

export async function clientProjectOptions(): Promise<{ id: string; label: string }[]> {
  try {
    const cps = await prisma.clientProject.findMany({ orderBy: { updatedAt: "desc" }, include: { client: true } });
    return cps.map(cp => ({ id: cp.id, label: `${cp.client.fullName} · ${cp.projectType}` }));
  } catch { return []; }
}

export async function editorDetail(projectId: string | null): Promise<{ ready: boolean; detail: Omit<ProjectDetail, "projectId"> }> {
  const db = portfolioDb();
  let ready = false;
  try { ready = await detailsReady(db); } catch { ready = false; }
  const d = ready && projectId ? await getDetail(db, projectId).catch(() => null) : null;
  const { projectId: _omit, ...rest } = d ?? emptyDetail();
  void _omit;
  return { ready, detail: rest };
}
