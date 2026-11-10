import "server-only";
import { getAuthSession } from "@/app/lib/auth/session.server";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { PortalError } from "./schema";
export const portalEnabled = () => process.env.CUSTOMER_PORTAL_ENABLED === "true";
export async function requirePortalOwner() {
  if (!portalEnabled()) throw new PortalError("The customer portal is not enabled yet.");
  const user = await getAuthSession().getUser();
  if (!user?.id) throw new PortalError("Sign in to view your projects.");
  return user.id;
}
export async function requirePortalAdmin() { const actor = await requireCatalogueAdmin(); if (!portalEnabled()) throw new PortalError("The customer portal is not enabled yet."); return actor; }
