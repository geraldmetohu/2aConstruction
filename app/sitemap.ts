import type { MetadataRoute } from "next";
import { prisma } from "@/app/lib/db";
import { AREAS } from "@/app/lib/seo/areas";

const base = "https://2aconstruction.co.uk";
const CATEGORIES = ["extention", "loft", "refurbishment", "roof", "general", "painting", "flooring", "plumbing", "electrical"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/portfolio/all`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/estimator`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/instant-quote`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/areas`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...AREAS.map(a => ({ url: `${base}/areas/${a.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: a.kind === "hub" ? 0.8 : 0.7 })),
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/certifications`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    ...CATEGORIES.map(c => ({ url: `${base}/portfolio/${c}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
  try {
    const projects = await prisma.project.findMany({ where: { status: "published" }, select: { id: true, createdAt: true } });
    pages.push(...projects.map(p => ({ url: `${base}/project/${p.id}`, lastModified: p.createdAt ?? now, changeFrequency: "yearly" as const, priority: 0.6 })));
  } catch { /* database unavailable: static pages only */ }
  return pages;
}
