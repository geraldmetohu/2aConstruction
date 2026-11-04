"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { detailsReady, saveDetail } from "@/app/lib/portfolio/details-store";
import { portfolioDb } from "@/app/lib/portfolio/details.server";
import { projectAdmin } from "./access";

const CATEGORIES = ["general", "refurbishment", "extention", "roof", "loft", "painting", "flooring", "plumbing", "electrical"] as const;
const url = z.string().trim().url().max(1000);
const text = (max: number) => z.string().trim().max(max).default("");
const list = (max: number) => z.array(z.string().trim().min(1).max(200)).max(max).default([]);

const schema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(3, "Give the project a title (at least 3 characters)").max(140),
  description: z.string().trim().min(20, "Write a short description (at least 20 characters) – it's used on cards and search results").max(8000),
  status: z.enum(["draft", "published", "archived"]),
  category: z.enum(CATEGORIES),
  isFeatured: z.boolean(),
  images: z.array(url).max(80),
  sourceClientProjectId: z.string().uuid().nullable(),
  detail: z.object({
    subtitle: text(200), location: text(120), propertyType: text(120), completedOn: text(40), duration: text(60), floorArea: text(60),
    valueBand: text(60), showValue: z.boolean().default(false),
    brief: text(4000), approach: text(8000), outcome: text(4000),
    scope: list(30), highlights: list(12), materials: list(30),
    coverImage: z.union([z.literal(""), url]).default(""), beforeImage: z.union([z.literal(""), url]).default(""), afterImage: z.union([z.literal(""), url]).default(""),
    captions: z.record(z.string().max(1000), z.string().trim().max(200)).default({}),
    testimonial: text(1500), testimonialName: text(120), testimonialRating: z.number().int().min(1).max(5).nullable().default(null),
    sourceQuoteId: z.string().uuid().nullable().default(null), sortOrder: z.number().int().min(-1000).max(1000).default(0), seoDescription: text(300),
  }),
}).superRefine((v, ctx) => {
  if (v.status === "published" && v.images.length === 0) ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one photo before publishing" });
});

export type SaveProjectResult = { ok: true; id: string; note?: string } | { ok: false; message: string; field?: string };

/**
 * Create or update a portfolio project. The Project row is written exactly as before (same columns);
 * the extra write-up goes into the separate ProjectDetail table when it exists.
 */
export async function saveProjectAction(raw: unknown): Promise<SaveProjectResult> {
  if (!(await projectAdmin())) return { ok: false, message: "You don't have permission to edit projects." };
  const p = schema.safeParse(raw);
  if (!p.success) { const i = p.error.issues[0]; return { ok: false, message: i.message, field: String(i.path.join(".")) }; }
  const v = p.data;
  const images = [...new Set(v.images)];
  const captions = Object.fromEntries(Object.entries(v.detail.captions).filter(([k, c]) => c && images.includes(k)));
  const keep = (u: string) => (u && images.includes(u) ? u : "");

  try {
    const data = { name: v.name, description: v.description, status: v.status, category: v.category, isFeatured: v.isFeatured, images, sourceClientProjectId: v.sourceClientProjectId };
    let id = v.id;
    if (id) {
      const exists = await prisma.project.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return { ok: false, message: "This project no longer exists." };
      await prisma.project.update({ where: { id }, data });
    } else {
      id = (await prisma.project.create({ data, select: { id: true } })).id;
    }

    let note: string | undefined;
    const db = portfolioDb();
    if (await detailsReady(db)) {
      await saveDetail(db, id, { ...v.detail, captions, coverImage: keep(v.detail.coverImage), beforeImage: keep(v.detail.beforeImage), afterImage: keep(v.detail.afterImage) });
    } else {
      note = "Saved the project. The extra write-up fields need the new ProjectDetail table (migration 20261103120000_add_project_details) before they can be stored.";
    }

    revalidatePath("/dashboard/projects"); revalidatePath(`/dashboard/projects/${id}`);
    revalidatePath(`/project/${id}`); revalidatePath("/portfolio/[name]", "page"); revalidatePath("/");
    return { ok: true, id, note };
  } catch (e) {
    console.error("[projects] save failed", e);
    return { ok: false, message: "Couldn't save the project. Please try again." };
  }
}
