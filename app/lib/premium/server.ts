import "server-only";
import { getAuthSession } from "@/app/lib/auth/session.server";

// The paid premium estimator (Stripe checkout) has been retired. Earlier paid estimates stay readable.
export function premiumEnabled() { return false; }
export async function premiumOwner() { const user = await getAuthSession().getUser(); return user?.id ?? null; }
