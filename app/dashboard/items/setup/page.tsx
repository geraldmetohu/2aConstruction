import Link from "next/link";
import { getLookups } from "@/app/lib/catalogue/queries";
import { LookupKind, lookupKinds } from "@/app/lib/catalogue/validation";
import { SetupManager } from "@/app/componets/dashboard/catalogue/SetupManager";
import { canOpenCatalogue, CatalogueHeader, isMissingCatalogue, Saved, tabClass, Unavailable } from "../_components";
export const dynamic = "force-dynamic";
export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!await canOpenCatalogue()) return <Unavailable pending />;
  const query = await searchParams;
  const kind: LookupKind = lookupKinds.includes(query.kind as LookupKind) ? query.kind as LookupKind : "category";
  let data;
  try { data = await getLookups(); } catch (error) { if (isMissingCatalogue(error)) return <Unavailable />; throw error; }
  const labels = { category: "Categories", unit: "Units", labour: "Labour", supplier: "Suppliers", tax: "VAT" };
  const revisionKey = [...data.categories, ...data.units, ...data.labour, ...data.suppliers, ...data.tax].map(r => `${r.id}:${r.revision}`).join("|");
  const selected = typeof query.entry === "string" ? query.entry : "";
  return <><CatalogueHeader title="Catalogue setup" description="Manage categories, units, suppliers, labour rates and VAT settings. Your company controls all commercial prices and rates." /><Saved value={query.saved} /><nav aria-label="Setup sections" className="mb-6 flex flex-wrap gap-2">{lookupKinds.map(k => <Link key={k} href={`/dashboard/items/setup?kind=${k}`} aria-current={k === kind ? "page" : undefined} className={`${tabClass} ${k === kind ? "border-amber-400 bg-amber-50" : ""}`}>{labels[k]}</Link>)}</nav><SetupManager key={`${kind}-${revisionKey}-${selected}`} data={data} kind={kind} initialSelected={selected} /></>;
}
