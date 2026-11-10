import type { ReactNode } from "react";
import type { QuoteDocs } from "@/app/lib/takeoff/documents";
import type { Register, SitePack } from "@/app/lib/takeoff/site-pack";
import { band, H, Page, Sections } from "./DocParts";

export type PackKind = "welcome" | "neighbour" | "variation" | "privacy" | "f10" | "activityRams" | "toolbox" | "induction" | "permits" | "tempworks" | "fire" | "registers" | "waste"
  | "buildingRegs" | "snagging" | "handover" | "report";
/** [kind, name, group, shown to the client] */
export const packKinds: [PackKind, string, "Client" | "Health & safety" | "Compliance & quality" | "Completion", boolean][] = [
  ["welcome", "Welcome letter – what to expect", "Client", true], ["neighbour", "Neighbour letter", "Client", false], ["variation", "Variation order form", "Client", true],
  ["privacy", "Privacy notice & complaints procedure", "Client", true],
  ["f10", "CDM notification check (F10)", "Health & safety", false], ["activityRams", "RAMS for each activity", "Health & safety", true], ["toolbox", "Toolbox talks & briefing records", "Health & safety", false],
  ["induction", "Site induction", "Health & safety", false], ["permits", "Permits to work", "Health & safety", false], ["tempworks", "Temporary works, lifting plan & asbestos", "Health & safety", false],
  ["fire", "Fire & emergency plan", "Health & safety", true], ["registers", "Site registers & inspection records", "Health & safety", false], ["waste", "Site waste plan", "Health & safety", false],
  ["buildingRegs", "Building Regulations checklist & inspection plan", "Compliance & quality", true],
  ["snagging", "Snagging list", "Completion", true], ["handover", "Handover: certificates, H&S file, practical completion", "Completion", true], ["report", "Job completion report", "Completion", true],
];

const Blank = ({ rows, cols }: { rows: number; cols: string[] }) => (
  <table className="w-full table-fixed border-collapse text-[11px]">
    <thead><tr>{cols.map(c => <th key={c} className="border border-neutral-300 bg-neutral-50 px-1.5 py-1 text-left font-semibold">{c}</th>)}</tr></thead>
    <tbody>{Array.from({ length: rows }, (_, i) => <tr key={i}>{cols.map(c => <td key={c} className="h-7 border border-neutral-300" />)}</tr>)}</tbody>
  </table>
);
const List = ({ items }: { items: string[] }) => <ul className="mt-1 list-disc space-y-0.5 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
const Box = ({ title, children }: { title: string; children: ReactNode }) => <div className="break-inside-avoid rounded-lg border p-3"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">{title}</p>{children}</div>;
const Sign = ({ labels }: { labels: string[] }) => <div className="mt-6 grid grid-cols-2 gap-8">{labels.map(l => <div key={l} className="border-t pt-1 text-xs">{l}</div>)}</div>;

function People({ p }: { p: SitePack }) {
  const x = p.people;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 rounded-lg bg-neutral-50 p-3 text-xs sm:grid-cols-[auto_1fr_auto_1fr] print:grid-cols-[auto_1fr_auto_1fr]">
      <dt className="text-neutral-500">Site manager</dt><dd>{x.siteManager} · {x.siteManagerPhone}</dd>
      <dt className="text-neutral-500">Site supervisor</dt><dd>{x.supervisor} · {x.supervisorPhone}</dd>
      <dt className="text-neutral-500">Health & safety</dt><dd>{x.healthSafety}</dd>
      <dt className="text-neutral-500">First aider</dt><dd>{x.firstAider}</dd>
      <dt className="text-neutral-500">Nearest A&E</dt><dd className="sm:col-span-3">{x.hospital}</dd>
    </dl>
  );
}

function ActivityRams({ d, p }: { d: QuoteDocs; p: SitePack }) {
  return <>{p.rams.map(r => (
    <Page key={r.id} d={d} title={`RAMS ${r.n} of ${p.rams.length}`} subtitle={`${r.title} – risk assessment & method statement for this job`}>
      <People p={p} />
      <Box title="Dates on this job"><p>{r.dates}</p></Box>
      <Box title="Scope of this activity on this job"><List items={r.scope} /></Box>
      <Box title="Sequence of work"><ol className="mt-1 list-decimal space-y-0.5 pl-5">{r.sequence.map((s, i) => <li key={i}>{s}</li>)}</ol></Box>
      <div><H>Risk assessment</H>
        <p className="mt-1 text-xs text-neutral-600">Risk = likelihood × severity (1–5 each): 1–7 low, 8–14 medium, 15–25 high. Residual risk after the controls.</p>
        <table className="mt-2 w-full table-fixed text-xs"><colgroup><col className="w-[24%]" /><col className="w-[18%]" /><col className="w-[7%]" /><col className="w-[44%]" /><col className="w-[7%]" /></colgroup>
          <thead><tr className="border-b text-left text-neutral-500"><th className="py-1 pr-2">Hazard</th><th className="pr-2">Who / harm</th><th>Risk</th><th className="px-2">Controls</th><th>After</th></tr></thead>
          <tbody>{r.risks.map(k => (
            <tr key={k.hazard} className="break-inside-avoid border-b align-top">
              <td className="py-1.5 pr-2 font-semibold">{k.hazard}</td><td className="pr-2">{k.who}<span className="block text-neutral-500">{k.harm}</span></td>
              <td><span className={`rounded px-1.5 font-semibold ${band(k.beforeBand)}`}>{k.before}</span></td>
              <td className="px-2"><List items={k.controls} /></td><td><span className={`rounded px-1.5 font-semibold ${band(k.afterBand)}`}>{k.after}</span></td>
            </tr>))}</tbody></table>
      </div>
      <Box title="Controls specific to this activity"><List items={r.specific} /></Box>
      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        <Box title="Plant & equipment"><List items={r.plant} /></Box>
        <Box title="Competence & training"><p>{r.competence}</p>{r.permits.length > 0 && <p className="mt-1"><strong>Permits:</strong> {r.permits.join(", ")}</p>}</Box>
      </div>
      <Box title="PPE"><table className="mt-1 w-full text-xs"><tbody>{r.ppe.map(x => <tr key={x.item} className="border-b"><td className="py-0.5 pr-3">{x.item}</td><td className="text-neutral-600">{x.standard}</td></tr>)}</tbody></table></Box>
      {r.substances.length > 0 && <Box title="Hazardous substances (COSHH)"><p>{r.substances.join(" · ")} – safety data sheets on site; gloves, eye protection, ventilation.</p></Box>}
      {r.regs.length > 0 && <Box title="Building Regulations & legal checks"><List items={r.regs} /></Box>}
      {r.hold.length > 0 && <Box title="Hold points – sign before continuing"><List items={r.hold} /></Box>}
      <Box title="Emergency arrangements"><List items={r.emergency} /></Box>
      <div className="break-inside-avoid"><H>Briefing record</H><p className="mt-1 text-xs">I have read / been briefed on this RAMS and will work to it.</p>
        <div className="mt-2"><Blank rows={6} cols={["Name", "Company / trade", "Signature", "Date"]} /></div>
        <Sign labels={["Prepared by (name, signature, date)", "Approved by site manager (name, signature, date)"]} /></div>
    </Page>
  ))}</>;
}

function RegisterPage({ d, r }: { d: QuoteDocs; r: Register }) {
  return <Page d={d} title={r.title} subtitle={r.law}><Blank rows={r.rows} cols={r.columns} /></Page>;
}

export const PACK_RENDER: Record<PackKind, (d: QuoteDocs, p: SitePack) => ReactNode> = {
  welcome: (d, p) => <Page d={d} title="Welcome letter" subtitle="What to expect during your project"><Sections list={p.client.welcome} /><p className="mt-4">Yours sincerely,<br /><strong>{p.people.siteManager}</strong><br />{d.company.name}</p></Page>,
  neighbour: (d, p) => <Page d={d} title="Letter to neighbours" subtitle="Notice of building works">{p.client.neighbour.map((x, i) => <p key={i}>{x}</p>)}</Page>,
  variation: (d, p) => <Page d={d} title="Variation order" subtitle="Changes to the agreed works">{p.client.variation.map((x, i) => <p key={i} className="border-b pb-2">{x}</p>)}</Page>,
  privacy: (d, p) => <><Page d={d} title="Privacy notice" subtitle="UK GDPR / Data Protection Act 2018"><Sections list={p.client.privacy} /></Page><Page d={d} title="Complaints procedure"><Sections list={p.client.complaints} /></Page></>,
  f10: (d, p) => <Page d={d} title="CDM 2015 notification check" subtitle="Does this project need an F10 notification to the HSE?">
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm"><dt className="text-neutral-500">Working days</dt><dd>{p.f10.workingDays}</dd><dt className="text-neutral-500">Person-days</dt><dd>{p.f10.personDays || "—"}</dd><dt className="text-neutral-500">Peak people on site</dt><dd>{p.f10.peakCrew || "—"}</dd></dl>
    <p className={`rounded-lg px-3 py-2 ${p.f10.notifiable ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}><strong>{p.f10.notifiable ? "Notifiable" : "Not notifiable"}</strong> – {p.f10.text}</p>
    <p className="text-xs text-neutral-600">Domestic client: under CDM 2015 the client's duties pass to the contractor (single contractor) or principal contractor / principal designer (more than one contractor).</p></Page>,
  activityRams: (d, p) => <ActivityRams d={d} p={p} />,
  toolbox: (d, p) => <>{p.toolbox.map(t => <Page key={t.n} d={d} title={`Toolbox talk ${t.n}`} subtitle={t.title}>
    <Box title="Key points"><List items={t.points} /></Box>
    <p className="text-xs">Delivered by: ____________________  Date: ____________  Duration: ______ min</p>
    <Blank rows={10} cols={["Name", "Company / trade", "Signature"]} /></Page>)}</>,
  induction: (d, p) => <Page d={d} title="Site induction" subtitle="Every person, before starting work on site"><Sections list={p.induction} /><Blank rows={10} cols={["Date", "Name", "Trade", "CSCS no.", "Emergency contact", "Signature"]} /></Page>,
  permits: (d, p) => <>{p.permits.map(pm => <Page key={pm.id} d={d} title={pm.title} subtitle={pm.when}>
    <p className="text-xs text-neutral-600">For: {pm.activities.join(", ")}</p>
    <dl className="grid grid-cols-2 gap-3 text-xs"><div className="border-b pb-1">Permit no.: ______</div><div className="border-b pb-1">Location: ____________________</div><div className="border-b pb-1">Valid from: ______ to ______</div><div className="border-b pb-1">Work: ____________________</div></dl>
    <table className="w-full text-xs"><tbody>{pm.checks.map((c, i) => <tr key={i} className="border-b align-top"><td className="py-1 pr-2">{c}</td><td className="w-16 whitespace-nowrap">☐ Yes ☐ N/A</td></tr>)}</tbody></table>
    <Sign labels={["Issued by (name, signature, time)", "Accepted by (name, signature, time)", "Work complete / area safe (time)", "Permit cancelled by (name, time)"]} /></Page>)}</>,
  tempworks: (d, p) => <>
    {p.tempWorks && <Page d={d} title="Temporary works" subtitle="BS 5975 – design, check, permit to load and strike"><List items={p.tempWorks} /></Page>}
    {p.lifting && <Page d={d} title="Lifting plan" subtitle="LOLER 1998 – every lift planned, supervised and carried out safely"><List items={p.lifting} /><Sign labels={["Appointed person (plan)", "Lift supervisor (briefed)"]} /></Page>}
    <Page d={d} title="Asbestos" subtitle="Control of Asbestos Regulations 2012"><List items={p.asbestos} /></Page>
  </>,
  fire: (d, p) => <Page d={d} title="Fire & emergency plan" subtitle="Display in the welfare area"><People p={p} /><Sections list={p.fire} /></Page>,
  registers: (d, p) => <>{p.registers.map(r => <RegisterPage key={r.title} d={d} r={r} />)}</>,
  waste: (d, p) => <Page d={d} title="Site waste plan" subtitle="Waste duty of care – Environmental Protection Act 1990 s.34"><Sections list={p.waste} /></Page>,
  buildingRegs: (d, p) => <Page d={d} title="Building Regulations checklist" subtitle="Approved Documents A–S – checked at each stage so the work passes first time">
    <Box title="Approvals & notices"><List items={p.buildingRegs.notices} /></Box>
    <div><H>Building Control inspections</H><table className="mt-1 w-full text-xs"><tbody>{p.buildingRegs.stages.map(s => <tr key={s.title} className="border-b"><td className="py-1 pr-3">{s.title}</td><td className="w-40">Date: __________</td><td className="w-24">☐ Passed</td></tr>)}</tbody></table></div>
    {p.buildingRegs.checks.map(c => <Box key={c.activity} title={c.activity}><table className="mt-1 w-full text-xs"><tbody>{c.items.map((x, i) => <tr key={i} className="border-b align-top"><td className="py-1 pr-3">{x}</td><td className="w-20 whitespace-nowrap">☐ Checked</td></tr>)}</tbody></table></Box>)}
    {p.itp.length > 0 && <div><H>Inspection & test plan – hold points</H><table className="mt-1 w-full text-xs"><thead><tr className="border-b text-left text-neutral-500"><th className="py-1">Stage</th><th>Check / hold point</th><th>By</th><th>Date</th></tr></thead>
      <tbody>{p.itp.flatMap(s => s.checks.map((c, i) => <tr key={s.stage + i} className="border-b align-top"><td className="py-1 pr-2 font-semibold">{i === 0 ? s.stage : ""}</td><td className="pr-2">{c}</td><td className="w-24">________</td><td className="w-20">______</td></tr>))}</tbody></table></div>}
  </Page>,
  snagging: d => <Page d={d} title="Snagging list" subtitle="Agreed on the walk-round – both sides mark items done"><Blank rows={18} cols={["No.", "Room / area", "Item", "Raised by (us / client)", "Agreed fix", "Done – us", "Checked – client"]} /><Sign labels={["For the company", "Client"]} /></Page>,
  handover: (d, p) => <>
    <Page d={d} title="Handover pack" subtitle="Certificates, guarantees and information for the client"><table className="w-full text-xs"><tbody>{p.completion.certificates.map((c, i) => <tr key={i} className="border-b"><td className="py-1 pr-3">{c}</td><td className="w-24">☐ Handed over</td></tr>)}</tbody></table></Page>
    <Page d={d} title="Health & safety file" subtitle="CDM 2015 reg. 12 – kept by the client for future work on the building"><List items={p.completion.hsFile} /></Page>
    <Page d={d} title="Certificate of practical completion">{p.completion.practical.map((x, i) => <p key={i}>{x}</p>)}</Page>
  </>,
  report: (d, p) => <Page d={d} title="Job completion report" subtitle="Issued after the final payment"><Sections list={p.completion.report} /></Page>,
};
