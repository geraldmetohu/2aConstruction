import "server-only";
import { prisma } from "@/app/lib/db";
import { storefrontQuery } from "@/app/lib/storefront-query";
import { loadDetails } from "@/app/lib/portfolio/details.server";
import { orderedImages, paragraphs, completedLabel, type ProjectDetail } from "@/app/lib/portfolio/details-store";
import { categoryTitle } from "@/app/lib/portfolio/categories";

export interface PortfolioItem {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  cover: string | null;
  images: string[];
  summary: string;
  location: string;
  completed: string;
  subtitle: string;
  featured: boolean;
  detail: ProjectDetail | null;
}

/** All published projects, newest first (or by the admin's chosen order), with their write-ups. */
export async function publishedPortfolio(): Promise<PortfolioItem[]> {
  const rows = await storefrontQuery("Portfolio", () => prisma.project.findMany({
    where: { status: "published" },
    select: { id: true, name: true, description: true, images: true, category: true, isFeatured: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  }));
  const details = await loadDetails(rows.map(r => r.id));
  const items = rows.map(r => toItem(r, details.get(r.id) ?? null));
  return items.sort((a, b) => (b.detail?.sortOrder ?? 0) - (a.detail?.sortOrder ?? 0));
}

export function toItem(r: { id: string; name: string; description: string; images: string[]; category: string; isFeatured: boolean | null; createdAt: Date | null }, d: ProjectDetail | null): PortfolioItem {
  const images = orderedImages(r.images, d);
  const first = paragraphs(r.description)[0] ?? "";
  return {
    id: r.id, name: r.name, category: r.category, categoryLabel: categoryTitle(r.category), cover: images[0] ?? null, images,
    summary: d?.seoDescription || (first.length > 220 ? `${first.slice(0, 217).trimEnd()}…` : first),
    location: d?.location ?? "", completed: completedLabel(d?.completedOn ?? "", r.createdAt), subtitle: d?.subtitle ?? "",
    featured: !!r.isFeatured, detail: d,
  };
}
