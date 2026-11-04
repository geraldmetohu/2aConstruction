import "server-only";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

// The paid premium estimator (Stripe checkout) has been retired. Earlier paid estimates stay readable.
export function premiumEnabled() { return false; }
export async function premiumOwner() { const user = await getKindeServerSession().getUser(); return user?.id ?? null; }
