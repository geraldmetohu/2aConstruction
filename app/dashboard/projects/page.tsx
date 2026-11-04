import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ImageOff, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { categoryTitle } from "@/app/lib/portfolio/categories";
import { loadDetails } from "@/app/lib/portfolio/details.server";
import { orderedImages, type ProjectDetail } from "@/app/lib/portfolio/details-store";
import { projectAdmin } from "./access";

export const metadata: Metadata = { title: "Portfolio projects" };
export const dynamic = "force-dynamic";

const STATUS = ["all", "published", "draft", "archived"] as const;
type StatusFilter = (typeof STATUS)[number];
const tone = { published: "bg-emerald-100 text-emerald-800", draft: "bg-neutral-100 text-neutral-700", archived: "bg-amber-100 text-amber-800" } as const;

function quality(images: string[], d: ProjectDetail | undefined) {
  const c = [images.length > 0, images.length >= 6, !!d?.subtitle, !!d?.location, !!(d?.brief || d?.approach), (d?.scope.length ?? 0) >= 3, !!(d?.beforeImage && d?.afterImage), !!d?.testimonial];
  return { score: c.filter(Boolean).length, of: c.length };
}

export default async function ProjectsRoute({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  if (!(await projectAdmin())) redirect("/");
  const sp = await searchParams;
  const status: StatusFilter = (STATUS as readonly string[]).includes(sp.status ?? "") ? (sp.status as StatusFilter) : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);

  const rows = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { sourceClientProject: { include: { client: true } } },
  });
  const details = await loadDetails(rows.map(r => r.id));
  const counts = { all: rows.length, published: 0, draft: 0, archived: 0 } as Record<StatusFilter, number>;
  for (const r of rows) counts[r.status as StatusFilter]++;
  const shown = rows.filter(r => (status === "all" || r.status === status) && (!q || `${r.name} ${details.get(r.id)?.location ?? ""} ${r.category}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio projects</h1>
          <p className="text-sm text-neutral-600">Case studies shown on the website. {counts.published} published · {counts.draft} drafts{counts.archived ? ` · ${counts.archived} archived` : ""}</p>
        </div>
        <Link href="/dashboard/projects/create" className="inline-flex items-center gap-2 rounded-md bg-[#071a33] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c2a52]"><Plus className="h-4 w-4" />New project</Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
          {STATUS.map(s => (
            <Link key={s} href={`/dashboard/projects?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-md px-3 py-1.5 capitalize ${status === s ? "bg-white font-semibold shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}>
              {s} <span className="text-xs text-neutral-400">{counts[s]}</span>
            </Link>
          ))}
        </nav>
        <form className="relative ml-auto w-full max-w-xs" action="/dashboard/projects">
          <input type="hidden" name="status" value={status} />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input name="q" defaultValue={q} placeholder="Search title, area, category" className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#071a33] focus:ring-2 focus:ring-[#f5b400]/40" />
        </form>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-neutral-600">
          {rows.length ? "No projects match." : "No projects yet."} <Link href="/dashboard/projects/create" className="font-semibold text-[#071a33] underline">Add one</Link>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-white">
          {shown.map(r => {
            const d = details.get(r.id);
            const cover = orderedImages(r.images, d ?? null)[0];
            const qy = quality(r.images, d);
            return (
              <li key={r.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link href={`/dashboard/projects/${r.id}`} className="relative h-24 w-full shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:h-20 sm:w-28">
                  {cover ? <Image src={cover} alt="" fill sizes="112px" className="object-cover" /> : <ImageOff className="absolute inset-0 m-auto h-5 w-5 text-neutral-400" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/projects/${r.id}`} className="truncate font-semibold hover:underline">{r.name}</Link>
                    {r.isFeatured && <span title="Featured on homepage" className="inline-flex items-center gap-1 rounded-full bg-[#fff6d6] px-2 py-0.5 text-[11px] font-semibold text-[#8a6500]"><Star className="h-3 w-3 fill-current" />Featured</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${tone[r.status]}`}>{r.status}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {[categoryTitle(r.category), d?.location, `${r.images.length} photo${r.images.length === 1 ? "" : "s"}`, r.sourceClientProject ? `Client: ${r.sourceClientProject.client.fullName}` : null, r.createdAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(r.createdAt) : null].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex items-center gap-2" title="Write-up quality">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-[#f5b400]" style={{ width: `${(qy.score / qy.of) * 100}%` }} /></div>
                    <span className="text-[11px] text-neutral-500">Write-up {qy.score}/{qy.of}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/dashboard/projects/${r.id}`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"><Pencil className="h-3.5 w-3.5" />Edit</Link>
                  <Link href={`/project/${r.id}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50" aria-label="View on website"><ExternalLink className="h-3.5 w-3.5" /></Link>
                  <Link href={`/dashboard/projects/${r.id}/delete`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm text-red-700 hover:bg-red-50" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
