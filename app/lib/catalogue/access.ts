import "server-only";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { isCatalogueAdmin } from "./validation";

export class CatalogueError extends Error {}
export async function requireCatalogueAdmin() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!isCatalogueAdmin(user, process.env.ADMIN_EMAILS)) throw new CatalogueError("You do not have permission to manage the catalogue.");
  return user!.id;
}
export function catalogueEnabled() { return process.env.CATALOGUE_ADMIN_ENABLED === "true"; }
export function requireCatalogueEnabled() {
  if (!catalogueEnabled()) throw new CatalogueError("The item catalogue is not enabled yet.");
}
