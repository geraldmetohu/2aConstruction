import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getItem, getLookups } from "@/app/lib/catalogue/queries";
import { AvailabilityPanel, ItemDetailsForm, OptionsPanel, PricePanel, RecipePanel, SupplierPanel } from "@/app/componets/dashboard/catalogue/ItemEditor";
import { canOpenCatalogue, CatalogueHeader, isMissingCatalogue, Saved, tabClass, Unavailable } from "../_components";
export const dynamic = "force-dynamic";
const tabs = [["details", "Details"], ["prices", "Prices & history"], ["work", "Supporting items & labour"], ["options", "Options"], ["suppliers", "Supplier references"], ["availability", "Availability & duplicate"]];
export default async function ItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!await canOpenCatalogue()) return <Unavailable pending />;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const tab = tabs.some(([t]) => t === query.tab) ? String(query.tab) : "details";
  let item, lookups;
  try { [item, lookups] = await Promise.all([getItem(id), getLookups()]); } catch (error) { if (isMissingCatalogue(error)) return <Unavailable />; throw error; }
  if (!item) notFound();
  return <><CatalogueHeader title={item.name} description={`${item.code} · ${item.archivedAt ? "Archived" : item.active ? "Active" : "Inactive"}`} /><Saved value={query.saved} />
    <nav aria-label="Item sections" className="mb-6 flex flex-wrap gap-2">{tabs.map(([key, label]) => <Link key={key} href={`/dashboard/items/${id}?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={`${tabClass} ${tab === key ? "border-amber-400 bg-amber-50" : "bg-white"}`}>{label}</Link>)}</nav>
    <div key={`${item.id}-${item.revision}-${tab}`}>{tab === "details" ? <ItemDetailsForm item={item} lookups={lookups} /> : tab === "prices" ? <PricePanel item={item} lookups={lookups} /> : tab === "work" ? <RecipePanel item={item} lookups={lookups} /> : tab === "options" ? <OptionsPanel item={item} /> : tab === "suppliers" ? <SupplierPanel item={item} lookups={lookups} /> : <AvailabilityPanel item={item} />}</div>
  </>;
}
