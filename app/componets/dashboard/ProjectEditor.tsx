"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronLeft, ExternalLink, Eye, ImagePlus, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import { UploadDropzone } from "@/app/lib/uploadthing";
import { saveProjectAction } from "@/app/dashboard/projects/actions";
import { CATEGORY_META, CATEGORY_ORDER, type CategorySlug } from "@/app/lib/portfolio/categories";
import type { ProjectDetail } from "@/app/lib/portfolio/details-store";

export interface EditorProject {
  id: string | null;
  name: string;
  description: string;
  status: "draft" | "published" | "archived";
  category: CategorySlug;
  isFeatured: boolean;
  images: string[];
  sourceClientProjectId: string | null;
}
export interface PhotoSource { id: string; label: string; images: { url: string; caption?: string }[] }

type Detail = Omit<ProjectDetail, "projectId">;

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-[#071a33] focus:ring-2 focus:ring-[#f5b400]/40";
const PROPERTY = ["Victorian terrace", "Edwardian terrace", "1930s semi-detached", "Semi-detached", "Detached house", "End of terrace", "Bungalow", "Maisonette", "Flat", "Commercial unit"];
const VALUES = ["Under £25k", "£25k – £50k", "£50k – £100k", "£100k – £200k", "£200k+"];

export function ProjectEditor({ project, detail, sources, detailsReady, clientProjects = [] }: { project: EditorProject; detail: Detail; sources: PhotoSource[]; detailsReady: boolean; clientProjects?: { id: string; label: string }[] }) {
  const router = useRouter();
  const [p, setP] = useState(project);
  const [d, setD] = useState<Detail>(detail);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; field?: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const upP = <K extends keyof EditorProject>(k: K, v: EditorProject[K]) => { setP(x => ({ ...x, [k]: v })); setDirty(true); };
  const upD = <K extends keyof Detail>(k: K, v: Detail[K]) => { setD(x => ({ ...x, [k]: v })); setDirty(true); };

  const cover = d.coverImage && p.images.includes(d.coverImage) ? d.coverImage : p.images[0] ?? "";
  const checks = useMemo(() => [
    { ok: p.images.length > 0, label: "At least one photo" },
    { ok: p.images.length >= 6, label: "6+ photos for a full gallery" },
    { ok: !!d.subtitle, label: "Standfirst (one-line summary)" },
    { ok: !!d.location, label: "Location" },
    { ok: !!(d.brief || d.approach), label: "The brief / the work" },
    { ok: d.scope.length >= 3, label: "Scope of works (3+ items)" },
    { ok: !!(d.beforeImage && d.afterImage), label: "Before & after pair" },
    { ok: !!d.testimonial, label: "Client testimonial" },
  ], [p.images, d]);
  const score = checks.filter(c => c.ok).length;

  const save = (status?: EditorProject["status"]) => {
    const body = { ...p, status: status ?? p.status, detail: { ...d, coverImage: d.coverImage && p.images.includes(d.coverImage) ? d.coverImage : "" } };
    setMsg(null);
    setPending(true);
    void (async () => {
      let r: Awaited<ReturnType<typeof saveProjectAction>>;
      try { r = await saveProjectAction(body); } catch { r = { ok: false, message: "Couldn't reach the server. Check your connection and try again." }; }
      setPending(false);
      if (!r.ok) { setMsg({ ok: false, text: r.message, field: r.field }); return; }
      setDirty(false);
      if (status) setP(x => ({ ...x, status }));
      setMsg({ ok: true, text: r.note ?? (status === "published" ? "Published – it's live on the website." : "Saved.") });
      if (!p.id) router.replace(`/dashboard/projects/${r.id}`);
      else router.refresh();
    })();
  };

  const addImages = (urls: string[]) => { setP(x => ({ ...x, images: [...x.images, ...urls.filter(u => u && !x.images.includes(u))] })); setDirty(true); };
  const removeImage = (u: string) => {
    setP(x => ({ ...x, images: x.images.filter(i => i !== u) }));
    setD(x => ({ ...x, coverImage: x.coverImage === u ? "" : x.coverImage, beforeImage: x.beforeImage === u ? "" : x.beforeImage, afterImage: x.afterImage === u ? "" : x.afterImage }));
    setDirty(true);
  };
  const moveImage = (u: string, dir: -1 | 1) => setP(x => {
    const i = x.images.indexOf(u), j = i + dir;
    if (i < 0 || j < 0 || j >= x.images.length) return x;
    const next = [...x.images]; [next[i], next[j]] = [next[j], next[i]]; setDirty(true);
    return { ...x, images: next };
  });

  return (
    <div className="mx-auto max-w-7xl pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/projects" className="grid h-9 w-9 place-items-center rounded-md border hover:bg-neutral-50" aria-label="Back to projects"><ChevronLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{p.id ? "Edit portfolio project" : "New portfolio project"}</p>
            <h1 className="truncate text-lg font-semibold text-neutral-900">{p.name || "Untitled project"}</h1>
          </div>
          <StatusPill status={p.status} />
          {p.id && <Link href={`/project/${p.id}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"><Eye className="h-4 w-4" />Preview</Link>}
          <button type="button" disabled={pending} onClick={() => save()} className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}Save{p.status === "draft" ? " draft" : ""}
          </button>
          {p.status !== "published" && (
            <button type="button" disabled={pending} onClick={() => save("published")} className="inline-flex items-center gap-2 rounded-md bg-[#071a33] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c2a52] disabled:opacity-50">Publish</button>
          )}
        </div>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`mt-2 flex items-center gap-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>
            {msg.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{msg.text}
          </p>
        )}
        {!msg && dirty && <p className="mt-2 text-xs text-amber-700">Unsaved changes</p>}
      </div>

      {!detailsReady && (
        <div className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Title, description, category, status, featured and photos save as normal. The extra write-up fields (location, story, scope, captions, before/after, testimonial) are stored in a new table. Apply migration <code className="font-mono">20261103120000_add_project_details</code> to keep them.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Basics */}
          <Card title="Basics" hint="What appears on the portfolio list and at the top of the case study.">
            <Field label="Project title" required hint="Be specific, for example “Rear kitchen extension, Enfield”." error={msg?.field === "name" ? msg.text : undefined}>
              <input className={input} value={p.name} maxLength={140} onChange={e => upP("name", e.target.value)} placeholder="e.g. Hip-to-gable loft conversion with en-suite" />
            </Field>
            <Field label="Standfirst" hint="One or two sentences under the title. Sell the result, not the process.">
              <input className={input} value={d.subtitle} maxLength={200} onChange={e => upD("subtitle", e.target.value)} placeholder="A dark, narrow kitchen opened into a bright family space with roof lantern and bi-folds." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" required>
                <select className={input} value={p.category} onChange={e => upP("category", e.target.value as CategorySlug)}>
                  {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORY_META[c].title}</option>)}
                </select>
              </Field>
              <Field label="Location" hint="Area and postcode district, never the full address.">
                <input className={input} value={d.location} maxLength={120} onChange={e => upD("location", e.target.value)} placeholder="Enfield, EN2" />
              </Field>
            </div>
            <Field label="Description" required hint="Used for cards, search engines, and as the story if the sections below are left empty. Leave a blank line between paragraphs." error={msg?.field === "description" ? msg.text : undefined}>
              <textarea className={`${input} min-h-[120px]`} value={p.description} onChange={e => upP("description", e.target.value)} />
              <Counter n={p.description.length} max={8000} />
            </Field>
          </Card>

          {/* Facts */}
          <Card title="Project facts" hint="Shown as a strip under the hero image. Leave anything you don't want to show empty.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Property type">
                <input className={input} list="property-types" value={d.propertyType} onChange={e => upD("propertyType", e.target.value)} placeholder="Victorian terrace" />
                <datalist id="property-types">{PROPERTY.map(x => <option key={x} value={x} />)}</datalist>
              </Field>
              <Field label="Completed"><input type="month" className={input} value={/^\d{4}-\d{2}$/.test(d.completedOn) ? d.completedOn : ""} onChange={e => upD("completedOn", e.target.value)} /></Field>
              <Field label="Duration"><input className={input} value={d.duration} onChange={e => upD("duration", e.target.value)} placeholder="12 weeks" /></Field>
              <Field label="Area added / worked"><input className={input} value={d.floorArea} onChange={e => upD("floorArea", e.target.value)} placeholder="28 m²" /></Field>
              <Field label="Value band">
                <select className={input} value={d.valueBand} onChange={e => upD("valueBand", e.target.value)}><option value="">—</option>{VALUES.map(x => <option key={x}>{x}</option>)}</select>
              </Field>
              <Field label="Show value publicly">
                <Toggle checked={d.showValue} onChange={v => upD("showValue", v)} label={d.showValue ? "Shown" : "Hidden"} />
              </Field>
            </div>
          </Card>

          {/* Story */}
          <Card title="The story" hint="Three short sections read better than one long block. Write it as you'd explain the job to a neighbour.">
            <Field label="01 · The brief" hint="What the client had, what they wanted and any constraints (planning, access, budget, living in).">
              <textarea className={`${input} min-h-[96px]`} value={d.brief} onChange={e => upD("brief", e.target.value)} />
            </Field>
            <Field label="02 · The work" hint="How we approached it: structure, sequence, the tricky parts and the details you're proud of.">
              <textarea className={`${input} min-h-[140px]`} value={d.approach} onChange={e => upD("approach", e.target.value)} />
            </Field>
            <Field label="03 · The result" hint="What the client ended up with, and how it's used now.">
              <textarea className={`${input} min-h-[96px]`} value={d.outcome} onChange={e => upD("outcome", e.target.value)} />
            </Field>
          </Card>

          {/* Scope */}
          <Card title="Scope, highlights & materials">
            <ListEditor label="Scope of works" hint="Numbered list on the page. Add in build order." items={d.scope} onChange={v => upD("scope", v)} max={30}
              suggestions={CATEGORY_META[p.category].typicalScope} placeholder="e.g. 6m steel beam & padstones" />
            <ListEditor label="Highlights" hint="Up to 6 short points that make this project stand out." items={d.highlights} onChange={v => upD("highlights", v)} max={12} placeholder="e.g. Hidden gutter detail to keep the roofline clean" />
            <ListEditor label="Materials & finishes" items={d.materials} onChange={v => upD("materials", v)} max={30} placeholder="e.g. Crittall-style internal screen" chips />
          </Card>

          {/* Photos */}
          <Card title={`Photos (${p.images.length})`} hint="The first photo (or the one you star) is the cover. Use the arrows to set the order the gallery shows them in. Captions are optional but make the gallery feel finished.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {p.images.map((u, i) => {
                const isCover = u === cover;
                return (
                  <div key={u} className={`overflow-hidden rounded-lg border bg-white ${isCover ? "ring-2 ring-[#f5b400]" : ""}`}>
                    <div className="relative aspect-[4/3] bg-neutral-100">
                      <Image src={u} alt="" fill sizes="240px" className="object-cover" />
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">{String(i + 1).padStart(2, "0")}</span>
                      {isCover && <span className="absolute right-2 top-2 rounded bg-[#f5b400] px-1.5 py-0.5 text-[10px] font-semibold text-[#071a33]">COVER</span>}
                      {(d.beforeImage === u || d.afterImage === u) && <span className="absolute bottom-2 left-2 rounded bg-[#071a33] px-1.5 py-0.5 text-[10px] font-semibold text-white">{d.beforeImage === u ? "BEFORE" : "AFTER"}</span>}
                    </div>
                    <div className="space-y-2 p-2">
                      <input className={`${input} py-1.5 text-xs`} placeholder="Caption" maxLength={200} value={d.captions[u] ?? ""} onChange={e => upD("captions", { ...d.captions, [u]: e.target.value })} />
                      <div className="flex items-center gap-1">
                        <IconBtn label="Move earlier" onClick={() => moveImage(u, -1)} disabled={i === 0}><ArrowLeft className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn label="Move later" onClick={() => moveImage(u, 1)} disabled={i === p.images.length - 1}><ArrowRight className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn label="Use as cover" onClick={() => upD("coverImage", u)} active={isCover}><Star className={`h-3.5 w-3.5 ${isCover ? "fill-current" : ""}`} /></IconBtn>
                        <select aria-label="Before or after" className="ml-auto h-7 rounded border border-neutral-300 bg-white px-1 text-[11px]"
                          value={d.beforeImage === u ? "before" : d.afterImage === u ? "after" : ""}
                          onChange={e => { const v = e.target.value; setD(x => ({ ...x, beforeImage: v === "before" ? u : x.beforeImage === u ? "" : x.beforeImage, afterImage: v === "after" ? u : x.afterImage === u ? "" : x.afterImage })); setDirty(true); }}>
                          <option value="">—</option><option value="before">Before</option><option value="after">After</option>
                        </select>
                        <IconBtn label="Remove from project" onClick={() => removeImage(u)} danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex min-h-[180px] items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-2">
                <UploadDropzone
                  endpoint="imageUploader"
                  appearance={{ container: "border-0 p-2 m-0 w-full", label: "text-xs text-neutral-700", allowedContent: "text-[10px] text-neutral-500", button: "text-xs bg-[#071a33] ut-uploading:bg-neutral-500 px-3" }}
                  content={{ label: "Drop photos or click to upload" }}
                  onClientUploadComplete={(files: { url?: string; ufsUrl?: string; serverData?: { url?: string } }[]) => addImages(files.map(f => f.ufsUrl || f.url || f.serverData?.url || "").filter(Boolean))}
                  onUploadError={(e: Error) => setMsg({ ok: false, text: e.message || "Upload failed. Please try again." })}
                />
              </div>
            </div>
            {sources.length > 0 && (
              <div className="mt-4">
                <button type="button" onClick={() => setImportOpen(o => !o)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"><ImagePlus className="h-4 w-4" />{importOpen ? "Hide" : "Add photos from a job or client project"}</button>
                {importOpen && <ImportPanel sources={sources} have={p.images} onAdd={addImages} />}
              </div>
            )}
            <p className="mt-3 text-xs text-neutral-500">Removing a photo here only takes it off this project. The file stays in storage.</p>
          </Card>

          {/* Testimonial */}
          <Card title="Client testimonial" hint="Only use words the client actually said or wrote, with their permission.">
            <Field label="Quote"><textarea className={`${input} min-h-[90px]`} value={d.testimonial} maxLength={1500} onChange={e => upD("testimonial", e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name shown" hint="e.g. “Sarah & James, Enfield”."><input className={input} value={d.testimonialName} onChange={e => upD("testimonialName", e.target.value)} /></Field>
              <Field label="Star rating">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" aria-label={`${n} stars`} onClick={() => upD("testimonialRating", d.testimonialRating === n ? null : n)} className="p-1">
                      <Star className={`h-6 w-6 ${d.testimonialRating && n <= d.testimonialRating ? "fill-[#f5b400] text-[#f5b400]" : "text-neutral-300"}`} />
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card title="Publishing">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-1 text-xs font-medium">
              {(["draft", "published", "archived"] as const).map(s => (
                <button key={s} type="button" onClick={() => upP("status", s)} className={`rounded-md px-2 py-1.5 capitalize ${p.status === s ? "bg-white shadow-sm" : "text-neutral-500"}`}>{s}</button>
              ))}
            </div>
            <Toggle checked={p.isFeatured} onChange={v => upP("isFeatured", v)} label="Feature on the homepage" />
            <Field label="Position" hint="Higher numbers show first in the portfolio. 0 = newest first.">
              <input type="number" className={input} value={d.sortOrder} min={-1000} max={1000} onChange={e => upD("sortOrder", Math.max(-1000, Math.min(1000, Math.round(Number(e.target.value) || 0))))} />
            </Field>
            {clientProjects.length > 0 && (
              <Field label="Linked client project" hint="Optional. Links this case study to a client portal project.">
                <select className={input} value={p.sourceClientProjectId ?? ""} onChange={e => upP("sourceClientProjectId", e.target.value || null)}>
                  <option value="">None</option>{clientProjects.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
            )}
            {p.id && <Link href={`/project/${p.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-[#071a33] underline-offset-4 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Open the public page</Link>}
          </Card>

          <Card title={`Write-up quality · ${score}/${checks.length}`}>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-[#f5b400] transition-all" style={{ width: `${(score / checks.length) * 100}%` }} /></div>
            <ul className="space-y-1.5 text-sm">
              {checks.map(c => <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-neutral-800" : "text-neutral-400"}`}>{c.ok ? <Check className="h-4 w-4 text-emerald-600" /> : <span className="h-4 w-4 rounded-full border" />}{c.label}</li>)}
            </ul>
          </Card>

          {cover && (
            <Card title="Card preview">
              <div className="overflow-hidden rounded-md border">
                <div className="relative aspect-[4/3] bg-neutral-100"><Image src={cover} alt="" fill sizes="320px" className="object-cover" /><span className="absolute left-0 top-0 bg-[#071a33] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">{CATEGORY_META[p.category].short}</span></div>
                <div className="p-3"><p className="font-semibold leading-snug">{p.name || "Untitled"}</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-neutral-500">{d.location || "Location"}</p></div>
              </div>
            </Card>
          )}

          <Card title="Search & links">
            <Field label="Search description" hint="Optional. Up to 160 characters for Google results; otherwise the description is used.">
              <textarea className={`${input} min-h-[70px]`} maxLength={300} value={d.seoDescription} onChange={e => upD("seoDescription", e.target.value)} />
              <Counter n={d.seoDescription.length} max={160} soft />
            </Field>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      {hint && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, error, children }: { label: string; hint?: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-neutral-700">{label}{required && <span className="text-red-600"> *</span>}</span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : hint && <span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">{hint}</span>}
    </label>
  );
}

function Counter({ n, max, soft }: { n: number; max: number; soft?: boolean }) {
  return <span className={`mt-1 block text-right text-[10px] ${n > max ? (soft ? "text-amber-700" : "text-red-700") : "text-neutral-400"}`}>{n}/{max}</span>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm text-neutral-800">
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-[#071a33]" : "bg-neutral-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} /></span>
      {label}
    </button>
  );
}

function IconBtn({ label, onClick, disabled, active, danger, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className={`grid h-7 w-7 place-items-center rounded border text-neutral-600 transition disabled:opacity-30 ${active ? "border-[#f5b400] bg-[#fff6d6] text-[#8a6500]" : danger ? "hover:border-red-300 hover:bg-red-50 hover:text-red-700" : "hover:bg-neutral-100"}`}>
      {children}
    </button>
  );
}

function ListEditor({ label, hint, items, onChange, max, placeholder, suggestions, chips }: { label: string; hint?: string; items: string[]; onChange: (v: string[]) => void; max: number; placeholder?: string; suggestions?: string[]; chips?: boolean }) {
  const [draft, setDraft] = useState("");
  const add = (v: string) => { const t = v.trim(); if (!t || items.includes(t) || items.length >= max) return; onChange([...items, t]); setDraft(""); };
  const unused = (suggestions ?? []).filter(s => !items.includes(s));
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-700">{label} <span className="font-normal text-neutral-400">({items.length}/{max})</span></p>
      {hint && <p className="mt-0.5 text-[11px] text-neutral-500">{hint}</p>}
      {items.length > 0 && (chips ? (
        <div className="mt-2 flex flex-wrap gap-1.5">{items.map(x => <span key={x} className="inline-flex items-center gap-1 rounded-full border bg-neutral-50 px-2.5 py-1 text-xs">{x}<button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(items.filter(i => i !== x))}><X className="h-3 w-3" /></button></span>)}</div>
      ) : (
        <ol className="mt-2 divide-y rounded-md border">
          {items.map((x, i) => (
            <li key={x} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="w-5 font-mono text-[10px] text-neutral-400">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">{x}</span>
              <IconBtn label="Up" onClick={() => { if (i) { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); } }} disabled={i === 0}><ArrowLeft className="h-3 w-3 rotate-90" /></IconBtn>
              <IconBtn label="Remove" onClick={() => onChange(items.filter(v => v !== x))} danger><X className="h-3 w-3" /></IconBtn>
            </li>
          ))}
        </ol>
      ))}
      <div className="mt-2 flex gap-2">
        <input className={input} value={draft} placeholder={placeholder} maxLength={200} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }} />
        <button type="button" onClick={() => add(draft)} className="inline-flex items-center gap-1 rounded-md border px-3 text-sm hover:bg-neutral-50"><Plus className="h-4 w-4" />Add</button>
      </div>
      {unused.length > 0 && items.length < max && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[11px] text-neutral-400">Suggestions:</span>
          {unused.map(s => <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed px-2 py-0.5 text-[11px] text-neutral-600 hover:border-solid hover:bg-neutral-50">+ {s}</button>)}
        </div>
      )}
    </div>
  );
}

function ImportPanel({ sources, have, onAdd }: { sources: PhotoSource[]; have: string[]; onAdd: (urls: string[]) => void }) {
  const [src, setSrc] = useState(sources[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const s = sources.find(x => x.id === src);
  const avail = (s?.images ?? []).filter(i => !have.includes(i.url));
  return (
    <div className="mt-3 rounded-lg border bg-neutral-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${input} max-w-sm`} value={src} onChange={e => { setSrc(e.target.value); setPicked([]); }}>
          {sources.map(x => <option key={x.id} value={x.id}>{x.label} ({x.images.length})</option>)}
        </select>
        <button type="button" disabled={!picked.length} onClick={() => { onAdd(picked); setPicked([]); }} className="rounded-md bg-[#071a33] px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Add {picked.length || ""} selected</button>
        <button type="button" disabled={!avail.length} onClick={() => setPicked(avail.map(a => a.url))} className="rounded-md border px-3 py-2 text-sm disabled:opacity-40">Select all</button>
      </div>
      {avail.length === 0 ? <p className="mt-3 text-sm text-neutral-500">All photos from this source are already on the project.</p> : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {avail.map(i => {
            const on = picked.includes(i.url);
            return (
              <button key={i.url} type="button" onClick={() => setPicked(x => on ? x.filter(u => u !== i.url) : [...x, i.url])} title={i.caption} className={`relative aspect-square overflow-hidden rounded-md ${on ? "ring-2 ring-[#f5b400]" : "opacity-80 hover:opacity-100"}`}>
                <Image src={i.url} alt={i.caption ?? ""} fill sizes="120px" className="object-cover" />
                {on && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#f5b400] text-[#071a33]"><Check className="h-3 w-3" /></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: EditorProject["status"] }) {
  const tone = { draft: "bg-neutral-100 text-neutral-700", published: "bg-emerald-100 text-emerald-800", archived: "bg-amber-100 text-amber-800" }[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{status}</span>;
}
