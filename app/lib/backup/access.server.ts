import "server-only";
import { timingSafeEqual } from "node:crypto";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";

/** The weekly PC script sends Bearer <BACKUP_SECRET>; in the dashboard an admin's normal sign-in is enough. */
export async function backupAllowed(req: Request): Promise<boolean> {
  const secret = process.env.BACKUP_SECRET?.trim();
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (secret && secret.length >= 24 && given && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return true;
  try { await requireCatalogueAdmin(); return true; } catch { return false; }
}
