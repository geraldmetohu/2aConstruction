import "server-only";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

// Same people who could already manage projects, plus anyone in ADMIN_EMAILS.
const OWNERS = ["geraldmetohu@gmail.com", "hasanajaleksios@icloud.com", "ensisako11@gmail.com"];

export async function projectAdmin(): Promise<string | null> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!user?.id || !email) return null;
  const allowed = new Set([...OWNERS, ...(process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)]);
  return allowed.has(email) ? user.id : null;
}
