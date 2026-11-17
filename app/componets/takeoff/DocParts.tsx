import { Fragment, type ReactNode } from "react";
import { longDate, type DocSection, type QuoteDocs } from "@/app/lib/takeoff/documents";
import type { SafetySign, SiteZone, ZoneLevel } from "@/app/lib/takeoff/hs-zones";

const NAVY = "#071a33", GOLD = "#f5b400";

/** What the letterhead, cover and footer need: client documents (quotes, contracts) and company documents (policies, procedures) alike. */
export type DocHead = Pick<QuoteDocs, "company" | "reference" | "version" | "issueDate" | "title"> & { client?: QuoteDocs["client"] };

/** Risk band → solid traffic-light badge (red high, amber medium, green low). */
export const band = (b: string) => (b === "High" ? "bg-red-600 text-white" : b === "Medium" ? "bg-amber-400 text-neutral-950" : "bg-emerald-600 text-white");
const cellBand = (score: number) => (score >= 15 ? "bg-red-500" : score >= 8 ? "bg-amber-300" : "bg-emerald-400");

/** Traffic-light risk badge: "HIGH 20". */
export const RiskBadge = ({ score, label }: { score: number; label: string }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${band(label)}`}>{label} {score}</span>
);

const Logo = ({ d, light }: { d: DocHead; light?: boolean }) => {
  const c = d.company;
  return c.logoUrl
    ? <span className={light ? "inline-block rounded-md bg-white px-3 py-2" : ""}><img src={c.logoUrl} alt={c.name} className="h-12 w-auto" /></span>
    : <span className={`text-2xl font-black tracking-tight ${light ? "text-white" : "text-[#071a33]"}`}>{c.name}</span>;
};

const companyLine = (d: DocHead) => {
  const c = d.company;
  return `${c.registeredName || c.name}${c.companyNo ? ` · Registered in England & Wales no. ${c.companyNo}` : ""}${c.vatNo ? ` · VAT no. ${c.vatNo}` : ""}`;
};

/** A document page: letterhead, a navy title band with the reference details, and the company footer. */
export function Page({ d, title, subtitle, children, meta, accent }: { d: DocHead; title: string; subtitle?: string; children: ReactNode; meta?: [string, string][]; accent?: "safety" }) {
  const c = d.company;
  const details: [string, string][] = meta ?? [["Reference", `${d.reference}${d.version > 1 ? ` · v${d.version}` : ""}`], ["Date", longDate(d.issueDate)]];
  return (
    <section className="doc-page mx-auto max-w-[210mm] break-before-page overflow-x-auto bg-white px-5 py-7 shadow-sm ring-1 ring-black/5 sm:px-12 sm:py-10 print:max-w-none print:overflow-visible print:px-0 print:py-0 print:shadow-none print:ring-0">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <Logo d={d} />
        <div className="min-w-0 text-[11px] leading-snug text-neutral-600 sm:text-right">
          <p className="text-[13px] font-bold text-[#071a33]">{c.registeredName || c.name}</p>
          {c.address && <p className="whitespace-pre-line">{c.address}</p>}
          <p>{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
          {c.website && <p>{c.website}</p>}
        </div>
      </header>
      <div className="relative mt-5 overflow-hidden rounded-xl bg-[#071a33] px-5 py-4 text-white">
        <div aria-hidden className={`absolute -right-10 top-0 h-full w-16 skew-x-[-20deg] sm:w-28 ${accent === "safety" ? "bg-[repeating-linear-gradient(45deg,#f5b400_0_10px,#071a33_10px_20px)]" : "bg-[#f5b400]"}`} />
        <div aria-hidden className="absolute right-10 top-0 hidden h-full w-3 skew-x-[-20deg] bg-white/15 sm:right-20 sm:block" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 pr-8 sm:pr-20">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#f5b400]">{title}</p>
            <h1 className="mt-1 text-[18px] font-black leading-tight [overflow-wrap:anywhere] sm:text-[20px]">{d.title}</h1>
            {subtitle && <p className="mt-0.5 text-xs text-white/75">{subtitle}</p>}
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-[11px]">
            {details.map(([k, v]) => <Fragment key={k}><dt className="text-white/60">{k}</dt><dd className="whitespace-nowrap text-right font-semibold">{v}</dd></Fragment>)}
          </dl>
        </div>
      </div>
      <div className="mt-7 space-y-7">{children}</div>
      <footer className="mt-12 border-t-2 border-[#071a33] pt-2 text-[10px] text-neutral-500">
        <div className="flex flex-wrap justify-between gap-2"><span>{companyLine(d)}</span><span className="font-semibold text-[#071a33]">{d.reference}{d.version > 1 ? ` · v${d.version}` : ""}</span></div>
        {c.memberships && <p className="mt-0.5 text-[#b07f00]">{c.memberships}</p>}
      </footer>
    </section>
  );
}

/** Full cover page: brand band, the document and project, who it is for, contents and key facts. */
export function Cover({ d, kind, lead, contents, facts, meta, safety }: {
  d: DocHead; kind: string; lead?: string; contents?: string[]; facts?: [string, string][]; meta?: [string, string][]; safety?: boolean;
}) {
  const c = d.company;
  const details: [string, string][] = meta ?? [["Reference", `${d.reference}${d.version > 1 ? ` · v${d.version}` : ""}`], ["Issued", longDate(d.issueDate)]];
  return (
    <section className="doc-page doc-cover mx-auto flex max-w-[210mm] break-before-page flex-col overflow-hidden bg-white shadow-sm ring-1 ring-black/5 print:min-h-[262mm] print:max-w-none print:shadow-none print:ring-0">
      <div className="relative overflow-hidden bg-[#071a33] px-6 pb-12 pt-8 text-white sm:px-12 sm:pb-16 sm:pt-10">
        <div aria-hidden className={`absolute -right-24 top-0 h-full w-32 skew-x-[-18deg] sm:w-72 ${safety ? "bg-[repeating-linear-gradient(45deg,#f5b400_0_18px,#071a33_18px_36px)]" : "bg-[#f5b400]"}`} />
        <div aria-hidden className="absolute right-16 top-0 hidden h-full w-4 skew-x-[-18deg] bg-white/10 sm:right-44 sm:block" />
        <div className="relative"><Logo d={d} light /></div>
        <p className="relative mt-10 text-[11px] sm:mt-16 font-bold uppercase tracking-[0.35em] text-[#f5b400]">{kind}</p>
        <h1 className="relative mt-2 max-w-[calc(100%-4rem)] text-[26px] font-black leading-tight [overflow-wrap:anywhere] sm:max-w-[70%] sm:text-[40px]">{d.title}</h1>
        {lead && <p className="relative mt-3 max-w-[calc(100%-5.5rem)] text-sm leading-relaxed text-white/80 sm:max-w-[65%]">{lead}</p>}
      </div>
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD} 60%, ${NAVY})` }} />
      <div className="grid flex-1 gap-8 px-6 py-8 sm:grid-cols-2 sm:px-12 print:grid-cols-2">
        <div className="space-y-5">
          {d.client ? <>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Prepared for</p><p className="mt-1 text-lg font-bold text-[#071a33]">{d.client.name || "—"}</p>
              {d.client.address && d.client.address !== d.client.siteAddress && <p className="whitespace-pre-line text-sm text-neutral-700">{d.client.address}</p>}</div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Site</p><p className="mt-1 whitespace-pre-line text-sm text-neutral-800">{d.client.siteAddress || "—"}</p></div>
          </> : <div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Organisation</p><p className="mt-1 text-lg font-bold text-[#071a33]">{d.company.registeredName || d.company.name}</p>
            {d.company.address && <p className="whitespace-pre-line text-sm text-neutral-700">{d.company.address}</p>}</div>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-l-4 border-[#f5b400] pl-3 text-sm">
            {details.map(([k, v]) => <Fragment key={k}><dt className="text-neutral-500">{k}</dt><dd className="font-semibold text-[#071a33]">{v}</dd></Fragment>)}
          </dl>
        </div>
        {contents && contents.length > 0 && (
          <div className={contents.length > 12 ? "sm:col-span-2 print:col-span-2" : ""}>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Contents</p>
            <ol className={`mt-2 ${contents.length > 12 ? "columns-1 gap-8 text-xs sm:columns-2 print:columns-2" : "space-y-1.5 text-sm"}`}>
              {contents.map((t, i) => <li key={t} className={`flex break-inside-avoid items-baseline gap-3 ${contents.length > 12 ? "py-0.5" : ""}`}><span className="w-6 shrink-0 font-black tabular-nums text-[#b07f00]">{String(i + 1).padStart(2, "0")}</span><span className="flex-1 border-b border-dotted border-neutral-300 pb-0.5 text-[#071a33]">{t}</span></li>)}
            </ol>
          </div>
        )}
      </div>
      {facts && facts.length > 0 && (
        <div className="mx-6 mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[#071a33]/10 sm:mx-12 sm:grid-cols-4 print:grid-cols-4">
          {facts.map(([k, v], i) => <div key={k} className={`p-4 ${i === facts.length - 1 ? "bg-[#071a33] text-white" : "bg-white"}`}><p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${i === facts.length - 1 ? "text-[#f5b400]" : "text-neutral-500"}`}>{k}</p><p className="mt-1 text-base font-black tabular-nums">{v}</p></div>)}
        </div>
      )}
      <footer className="flex flex-wrap justify-between gap-2 bg-[#071a33] px-6 py-3 text-[10px] text-white/70 sm:px-12">
        <span>{[c.phone, c.email, c.website].filter(Boolean).join(" · ")}</span><span className="text-[#f5b400]">{c.memberships}</span>
      </footer>
    </section>
  );
}

/** Numbered section heading: "03  Scope of works & price". */
export const SectionTitle = ({ n, children }: { n?: number | string; children: ReactNode }) => (
  <h2 className="flex items-center gap-3 text-[15px] font-bold text-[#071a33]">
    {n !== undefined && <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-[#071a33] px-1.5 text-xs font-black text-[#f5b400]">{typeof n === "number" ? String(n).padStart(2, "0") : n}</span>}
    <span className="flex-1 border-b-2 border-[#071a33] pb-1">{children}</span>
  </h2>
);

/** A highlighted note, e.g. "Why choose us" or a key condition. */
export const Callout = ({ title, children, tone = "gold" }: { title?: string; children: ReactNode; tone?: "gold" | "navy" | "red" | "green" }) => {
  const t = { gold: "border-[#f5b400] bg-amber-50/70", navy: "border-[#071a33] bg-[#071a33]/[0.04]", red: "border-red-600 bg-red-50", green: "border-emerald-600 bg-emerald-50" }[tone];
  return <div className={`break-inside-avoid rounded-r-lg border-l-4 p-3 ${t}`}>{title && <p className="mb-1 text-xs font-black uppercase tracking-wide text-[#071a33]">{title}</p>}<div className="text-[12.5px]">{children}</div></div>;
};

/** Signature block: one column per party, with name, signature and date lines. */
export interface SignedBy { name: string; role?: string; signatureUrl?: string; date?: string }
export function Signatures({ parties }: { parties: { role: string; name?: string; signed?: SignedBy }[] }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 print:grid-cols-2">
      {parties.map(p => (
        <div key={p.role} className="break-inside-avoid overflow-hidden rounded-lg border border-neutral-200 text-xs">
          <p className="bg-[#071a33] px-4 py-1.5 font-bold uppercase tracking-wide text-white">{p.role}</p>
          <div className="px-4 pb-4">{(["Name", "Signature", "Date"] as const).map(l => (
            <div key={l} className={`flex items-end gap-2 ${l === "Signature" && p.signed?.signatureUrl ? "mt-2" : "mt-6"}`}><span className="w-16 shrink-0 text-neutral-500">{l}</span>
              <span className="flex min-h-[1rem] flex-1 items-end border-b border-neutral-400 pb-0.5 font-semibold">
                {l === "Name" ? (p.signed ? <span>{p.signed.name}{p.signed.role ? <span className="block text-[10px] font-normal text-neutral-600">{p.signed.role}</span> : null}</span> : p.name ?? "")
                  : l === "Signature" ? (p.signed?.signatureUrl ? <img src={p.signed.signatureUrl} alt={`Signature of ${p.signed.name}`} className="h-12 max-w-[14rem] object-contain object-left-bottom" /> : "")
                  : p.signed?.date ? longDate(p.signed.date) : ""}</span></div>))}</div>
        </div>
      ))}
    </div>
  );
}

export const H = ({ children }: { children: ReactNode }) => <SectionTitle>{children}</SectionTitle>;
export const Sections = ({ list }: { list: DocSection[] }) => (
  <>{list.map(s => {
    const m = s.heading.match(/^(\d+)\.\s*(.*)$/);
    return (
      <div key={s.heading} className="break-inside-avoid">
        {m ? <SectionTitle n={Number(m[1])}>{m[2]}</SectionTitle> : <h3 className="font-bold text-[#071a33]">{s.heading}</h3>}
        {s.paragraphs?.map((p, i) => <p key={i} className="mt-1.5">{p}</p>)}
        {s.items && <ul className="mt-1.5 space-y-1">{s.items.map((x, i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-[#f5b400]" /><span>{x}</span></li>)}</ul>}
      </div>
    );
  })}</>
);

// ---------------------------------------------------------------- Health & safety visuals

const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const SEVERITY = ["Negligible", "Minor", "Moderate", "Major", "Fatal"];

/** 5 × 5 likelihood × severity matrix, coloured red / amber / green, with the number of hazards in each cell. */
export function RiskMatrix({ title, points }: { title: string; points: [number, number][] }) {
  const count = (l: number, s: number) => points.filter(([a, b]) => a === l && b === s).length;
  return (
    <div className="break-inside-avoid">
      <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-[#071a33]">{title}</p>
      <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-0.5 text-[8px] sm:text-[9px]">
        <div />
        {SEVERITY.map((s, i) => <div key={s} className="min-w-0 px-0.5 pb-0.5 text-center font-semibold leading-tight text-neutral-600">{i + 1}<span className="block truncate font-normal">{s}</span></div>)}
        {[5, 4, 3, 2, 1].map(l => (
          <Fragment key={l}>
            <div className="flex items-center pr-1 text-right font-semibold leading-tight text-neutral-600"><span>{l} <span className="font-normal">{LIKELIHOOD[l - 1]}</span></span></div>
            {[1, 2, 3, 4, 5].map(s => {
              const n = count(l, s);
              return <div key={s} className={`flex aspect-[1.6] items-center justify-center rounded-sm ${cellBand(l * s)}`}>
                {n > 0 ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#071a33] text-[10px] font-black text-white">{n}</span> : <span className="text-[9px] font-semibold text-black/35">{l * s}</span>}
              </div>;
            })}
          </Fragment>
        ))}
      </div>
      <p className="mt-1 text-center text-[9px] text-neutral-500">Severity → · Likelihood ↑ · ● number of hazards</p>
    </div>
  );
}

export const RiskKey = () => (
  <div className="flex flex-wrap gap-2 text-[11px]">
    {([["bg-red-600 text-white", "High 15–25", "Stop – do not start until controls reduce the risk"], ["bg-amber-400 text-neutral-950", "Medium 8–14", "Proceed with the controls in place and supervised"], ["bg-emerald-600 text-white", "Low 1–7", "Acceptable – maintain the controls"]] as const)
      .map(([c, l, t]) => <span key={l} className="flex items-center gap-1.5 rounded-full border border-neutral-200 py-0.5 pl-0.5 pr-2.5"><span className={`rounded-full px-2 py-0.5 font-black ${c}`}>{l}</span><span className="text-neutral-600">{t}</span></span>)}
  </div>
);

const ZONE_STYLE: Record<ZoneLevel, { head: string; ring: string; title: string; note: string }> = {
  RED: { head: "bg-red-600 text-white", ring: "border-red-600", title: "Red zone – no entry", note: "Exclusion area. Only the named operatives doing the task; barriers, signs and a lookout where needed." },
  AMBER: { head: "bg-amber-400 text-neutral-950", ring: "border-amber-400", title: "Amber zone – controlled", note: "Authorised operatives in the right PPE only. Client and visitors accompanied by the site manager." },
  GREEN: { head: "bg-emerald-600 text-white", ring: "border-emerald-600", title: "Green zone – safe", note: "Safe for everyone. Kept clear, clean and lit." },
};

/** Site zone plan: red / amber / green areas for this job and how each is controlled. */
export function ZonePlan({ zones }: { zones: SiteZone[] }) {
  return (
    <div className="space-y-4">
      {/* The zones as nested bands: red inside amber inside green. */}
      <div className="break-inside-avoid rounded-xl border-[6px] border-emerald-600 bg-emerald-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">Green – welfare, routes, assembly point{zones.some(z => z.level === "GREEN" && /family/.test(z.area)) ? ", family areas" : ""}</p>
        <div className="mt-2 rounded-lg border-[6px] border-amber-400 bg-[repeating-linear-gradient(45deg,#fef3c7_0_8px,#fffbeb_8px_16px)] p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-amber-800">Amber – work areas, operatives only</p>
          <div className="mt-2 rounded-md border-[6px] border-red-600 bg-[repeating-linear-gradient(45deg,#fee2e2_0_8px,#fff1f2_8px_16px)] p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Red – danger, no entry</p>
            <p className="mt-0.5 text-[10px] text-red-800">{zones.filter(z => z.level === "RED").length ? zones.filter(z => z.level === "RED").map(z => z.area.split(/[,;(]/)[0]).join(" · ") : "No red zones on this job"}</p>
          </div>
        </div>
      </div>
      {(["RED", "AMBER", "GREEN"] as ZoneLevel[]).map(level => {
        const list = zones.filter(z => z.level === level);
        if (!list.length) return null;
        const st = ZONE_STYLE[level];
        return (
          <div key={level} className={`break-inside-avoid overflow-hidden rounded-lg border-2 ${st.ring}`}>
            <div className={`flex flex-wrap items-baseline justify-between gap-2 px-3 py-1.5 ${st.head}`}><p className="text-xs font-black uppercase tracking-wide">{st.title}</p><p className="text-[10px] opacity-90">{st.note}</p></div>
            <ul className="divide-y divide-neutral-200 text-xs sm:hidden print:hidden">{list.map(z => <li key={z.area} className="px-3 py-2"><p className="font-semibold">{z.area}</p><p className="text-neutral-600">{z.why}</p><p className="mt-0.5">{z.controls.join("; ")}</p></li>)}</ul>
            <table className="hidden w-full table-fixed text-xs sm:table print:table"><colgroup><col className="w-[34%]" /><col className="w-[22%]" /><col className="w-[44%]" /></colgroup>
              <tbody>{list.map(z => <tr key={z.area} className="border-t border-neutral-200 align-top"><td className="px-3 py-1.5 font-semibold">{z.area}</td><td className="py-1.5 pr-2 text-neutral-600">{z.why}</td><td className="py-1.5 pr-3">{z.controls.join("; ")}</td></tr>)}</tbody></table>
          </div>
        );
      })}
    </div>
  );
}

/** Simplified safety sign in the BS ISO 7010 colours and shapes. */
function SignShape({ kind }: { kind: SafetySign["kind"] }) {
  if (kind === "PROHIBITION") return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden><circle cx="20" cy="20" r="16" fill="#fff" stroke="#dc2626" strokeWidth="5" /><line x1="9" y1="9" x2="31" y2="31" stroke="#dc2626" strokeWidth="5" /></svg>;
  if (kind === "WARNING") return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden><path d="M20 3 L38 36 H2 Z" fill="#facc15" stroke="#111" strokeWidth="3" strokeLinejoin="round" /><rect x="18.3" y="14" width="3.4" height="12" rx="1" fill="#111" /><circle cx="20" cy="30.5" r="2" fill="#111" /></svg>;
  if (kind === "MANDATORY") return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden><circle cx="20" cy="20" r="18" fill="#1d4ed8" /><rect x="18.2" y="9" width="3.6" height="15" rx="1" fill="#fff" /><circle cx="20" cy="29.5" r="2.3" fill="#fff" /></svg>;
  if (kind === "FIRE") return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden><rect x="2" y="2" width="36" height="36" rx="3" fill="#dc2626" /><path d="M20 8c3 5 8 8 8 15a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 1 5 3 5-1-4 0-8 1-12z" fill="#fff" /></svg>;
  return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden><rect x="2" y="2" width="36" height="36" rx="3" fill="#16a34a" /><rect x="16" y="9" width="8" height="22" fill="#fff" /><rect x="9" y="16" width="22" height="8" fill="#fff" /></svg>;
}

const SIGN_LABEL: Record<SafetySign["kind"], string> = { PROHIBITION: "Prohibition (red)", WARNING: "Warning (yellow)", MANDATORY: "Mandatory (blue)", SAFE: "Safe condition (green)", FIRE: "Fire equipment (red)" };

export function SafetySigns({ signs }: { signs: SafetySign[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 print:grid-cols-2">
      {signs.map(s => (
        <div key={s.text} className="flex break-inside-avoid items-center gap-3 rounded-lg border border-neutral-200 p-2">
          <SignShape kind={s.kind} />
          <div className="min-w-0 text-xs"><p className="font-bold text-[#071a33]">{s.text}</p><p className="text-neutral-500">{SIGN_LABEL[s.kind]} · {s.where}</p></div>
        </div>
      ))}
    </div>
  );
}

/** A wide table scrolls sideways inside its own box on small screens instead of squashing (never when printing). */
export const ScrollX = ({ children, min = 560 }: { children: ReactNode; min?: number }) => (
  <div className="-mx-1 overflow-x-auto px-1 print:mx-0 print:overflow-visible print:px-0"><div style={{ minWidth: min }} className="print:!min-w-0">{children}</div></div>
);
