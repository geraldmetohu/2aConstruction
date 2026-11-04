import Link from "next/link";
import { redirect } from "next/navigation";
import { CatalogueError, catalogueEnabled, requireCatalogueAdmin } from "@/app/lib/catalogue/access";

export async function canOpenCatalogue() {
  try { await requireCatalogueAdmin(); } catch (error) { if (error instanceof CatalogueError) redirect("/"); throw error; }
  return catalogueEnabled();
}
export function Unavailable({ pending = false }: { pending?: boolean }) {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-bold">Item catalogue</h1><p className="mt-3 max-w-2xl text-sm leading-6">{pending ? "The catalogue is awaiting setup. Once enabled, you can manage construction items, prices, labour and suppliers here." : "The catalogue is currently unavailable. Please try again later or ask your administrator to check its setup."}</p><Link href="/dashboard" className="mt-5 inline-block text-sm font-semibold underline">Back to dashboard</Link></div>;
}
export function Saved({ value }: { value: unknown }) { return value === "1" ? <p role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">Changes saved successfully.</p> : null; }
export const tabClass = "inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-neutral-50";
export function CatalogueHeader({ title, description }: { title: string; description: string }) { return <header className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Construction catalogue</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">{description}</p><nav aria-label="Catalogue navigation" className="mt-5 flex flex-wrap gap-2"><Link className={tabClass} href="/dashboard/items">Items</Link><Link className={tabClass} href="/dashboard/items/new">+ New item</Link><Link className={tabClass} href="/dashboard/items/setup">Catalogue setup</Link></nav></header>; }
export function isMissingCatalogue(error: unknown) { return !!error && typeof error === "object" && "code" in error && ["P2021", "P2022"].includes(String(error.code)); }
