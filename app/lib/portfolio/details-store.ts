// Read and write the optional "ProjectDetail" write-up for a portfolio project.
// Raw SQL so it works before `prisma generate` is re-run, and returns nothing (rather than failing)
// when the new table has not been created yet. The live "Project" table is only ever read here.
import type { Sql } from "@/app/lib/takeoff/store";

export interface ProjectDetail {
  projectId: string;
  subtitle: string;
  location: string;
  propertyType: string;
  completedOn: string; // "YYYY-MM" or free text
  duration: string;
  floorArea: string;
  valueBand: string;
  showValue: boolean;
  brief: string;
  approach: string;
  outcome: string;
  scope: string[];
  highlights: string[];
  materials: string[];
  coverImage: string;
  beforeImage: string;
  afterImage: string;
  captions: Record<string, string>;
  testimonial: string;
  testimonialName: string;
  testimonialRating: number | null;
  sourceQuoteId: string | null;
  sortOrder: number;
  seoDescription: string;
}

export type ProjectDetailInput = Omit<ProjectDetail, "projectId">;

export const emptyDetail = (projectId = ""): ProjectDetail => ({
  projectId, subtitle: "", location: "", propertyType: "", completedOn: "", duration: "", floorArea: "", valueBand: "", showValue: false,
  brief: "", approach: "", outcome: "", scope: [], highlights: [], materials: [], coverImage: "", beforeImage: "", afterImage: "", captions: {},
  testimonial: "", testimonialName: "", testimonialRating: null, sourceQuoteId: null, sortOrder: 0, seoDescription: "",
});

const COLS = `"projectId"::text AS "projectId", "subtitle", "location", "propertyType", "completedOn", "duration", "floorArea", "valueBand", "showValue",
  "brief", "approach", "outcome", "scope", "highlights", "materials", "coverImage", "beforeImage", "afterImage", "captions",
  "testimonial", "testimonialName", "testimonialRating", "sourceQuoteId"::text AS "sourceQuoteId", "sortOrder", "seoDescription"`;

export async function detailsReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"ProjectDetail"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

function clean(row: ProjectDetail): ProjectDetail {
  const captions = typeof row.captions === "string" ? safeJson(row.captions) : row.captions;
  return { ...emptyDetail(row.projectId), ...row, captions: captions && typeof captions === "object" ? captions as Record<string, string> : {} };
}
function safeJson(s: string): unknown { try { return JSON.parse(s); } catch { return {}; } }

export async function getDetail(db: Sql, projectId: string): Promise<ProjectDetail | null> {
  if (!(await detailsReady(db))) return null;
  const [row] = await db.query<ProjectDetail>(`SELECT ${COLS} FROM "ProjectDetail" WHERE "projectId" = $1::uuid`, [projectId]);
  return row ? clean(row) : null;
}

export async function getDetails(db: Sql, projectIds: string[]): Promise<Map<string, ProjectDetail>> {
  const out = new Map<string, ProjectDetail>();
  if (!projectIds.length || !(await detailsReady(db))) return out;
  const rows = await db.query<ProjectDetail>(`SELECT ${COLS} FROM "ProjectDetail" WHERE "projectId" = ANY($1::uuid[])`, [projectIds]);
  for (const r of rows) out.set(r.projectId, clean(r));
  return out;
}

/** Insert or update the write-up. Only touches the ProjectDetail table. */
export async function saveDetail(db: Sql, projectId: string, d: ProjectDetailInput): Promise<void> {
  await db.query(`INSERT INTO "ProjectDetail" ("projectId", "subtitle", "location", "propertyType", "completedOn", "duration", "floorArea", "valueBand", "showValue",
      "brief", "approach", "outcome", "scope", "highlights", "materials", "coverImage", "beforeImage", "afterImage", "captions",
      "testimonial", "testimonialName", "testimonialRating", "sourceQuoteId", "sortOrder", "seoDescription", "updatedAt")
    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::boolean, $10, $11, $12, $13::text[], $14::text[], $15::text[], $16, $17, $18, $19::jsonb, $20, $21, $22::int, $23::uuid, $24::int, $25, now())
    ON CONFLICT ("projectId") DO UPDATE SET
      "subtitle" = EXCLUDED."subtitle", "location" = EXCLUDED."location", "propertyType" = EXCLUDED."propertyType", "completedOn" = EXCLUDED."completedOn",
      "duration" = EXCLUDED."duration", "floorArea" = EXCLUDED."floorArea", "valueBand" = EXCLUDED."valueBand", "showValue" = EXCLUDED."showValue",
      "brief" = EXCLUDED."brief", "approach" = EXCLUDED."approach", "outcome" = EXCLUDED."outcome", "scope" = EXCLUDED."scope", "highlights" = EXCLUDED."highlights",
      "materials" = EXCLUDED."materials", "coverImage" = EXCLUDED."coverImage", "beforeImage" = EXCLUDED."beforeImage", "afterImage" = EXCLUDED."afterImage",
      "captions" = EXCLUDED."captions", "testimonial" = EXCLUDED."testimonial", "testimonialName" = EXCLUDED."testimonialName",
      "testimonialRating" = EXCLUDED."testimonialRating", "sourceQuoteId" = EXCLUDED."sourceQuoteId", "sortOrder" = EXCLUDED."sortOrder",
      "seoDescription" = EXCLUDED."seoDescription", "updatedAt" = now()`,
  [projectId, d.subtitle, d.location, d.propertyType, d.completedOn, d.duration, d.floorArea, d.valueBand, d.showValue, d.brief, d.approach, d.outcome,
    d.scope, d.highlights, d.materials, d.coverImage, d.beforeImage, d.afterImage, JSON.stringify(d.captions ?? {}), d.testimonial, d.testimonialName,
    d.testimonialRating, d.sourceQuoteId, d.sortOrder, d.seoDescription]);
}

// ---------------------------------------------------------------- Presentation helpers (pure)

/** Split a long description into readable paragraphs. */
export function paragraphs(text: string): string[] {
  const t = (text ?? "").replace(/\r/g, "").trim();
  if (!t) return [];
  const byBlank = t.split(/\n\s*\n/).map(s => s.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  const lines = t.split(/\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  // One long block: break roughly every three sentences.
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map(s => s.trim()) ?? [t];
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) out.push(sentences.slice(i, i + 3).join(" "));
  return out;
}

/** The public story: the write-up when there is one, otherwise the description split into brief / work / result. */
export function story(description: string, d: ProjectDetail | null): { brief: string[]; approach: string[]; outcome: string[] } {
  if (d && (d.brief || d.approach || d.outcome)) {
    return { brief: paragraphs(d.brief), approach: paragraphs(d.approach), outcome: paragraphs(d.outcome) };
  }
  const p = paragraphs(description);
  if (p.length >= 3) return { brief: [p[0]], approach: p.slice(1, -1), outcome: [p[p.length - 1]] };
  return { brief: p.slice(0, 1), approach: p.slice(1), outcome: [] };
}

/** Gallery in the admin's order, with the cover first and before/after shots kept in. */
export function orderedImages(images: string[], d: ProjectDetail | null): string[] {
  const list = (images ?? []).filter(Boolean);
  const cover = d?.coverImage && list.includes(d.coverImage) ? d.coverImage : null;
  return cover ? [cover, ...list.filter(u => u !== cover)] : list;
}

export function completedLabel(completedOn: string, fallback: Date | null): string {
  const m = /^(\d{4})-(\d{2})$/.exec(completedOn ?? "");
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  if (completedOn) return completedOn;
  return fallback ? new Date(fallback).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "";
}
