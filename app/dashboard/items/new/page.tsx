import { getLookups } from "@/app/lib/catalogue/queries";
import { ItemDetailsForm } from "@/app/componets/dashboard/catalogue/ItemEditor";
import { canOpenCatalogue, CatalogueHeader, isMissingCatalogue, Unavailable } from "../_components";
export const dynamic = "force-dynamic";
export default async function NewItemPage() {
  if (!await canOpenCatalogue()) return <Unavailable pending />;
  let lookups;
  try { lookups = await getLookups(); } catch (error) { if (isMissingCatalogue(error)) return <Unavailable />; throw error; }
  return <><CatalogueHeader title="Add an item" description="Start with the item details, then add its prices, options and work specifications." /><ItemDetailsForm lookups={lookups} /></>;
}
