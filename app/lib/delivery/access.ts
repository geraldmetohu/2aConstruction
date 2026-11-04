import "server-only";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { ConversionError } from "./plan";
export const deliveryEnabled = () => process.env.PROJECT_CONVERSION_ENABLED === "true";
export async function requireDeliveryAdmin() {
  const actor = await requireCatalogueAdmin();
  if (!deliveryEnabled()) throw new ConversionError("Project conversion is not enabled yet.");
  return actor;
}
