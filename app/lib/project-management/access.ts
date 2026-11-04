import "server-only";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { ManagementError } from "./schema";
export const managementEnabled = () => process.env.PROJECT_MANAGEMENT_ENABLED === "true";
export async function requireManagementAdmin() {
  const actor = await requireCatalogueAdmin();
  if (!managementEnabled()) throw new ManagementError("Project management is not enabled yet.");
  return actor;
}
