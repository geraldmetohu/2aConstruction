import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

/** Tag on every cached piece of public website content; admin edits call revalidateTag(STOREFRONT_TAG). */
export const STOREFRONT_TAG = "storefront";
/** Public content is re-read from the database at most every 10 minutes (or straight away after an admin edit). */
const REVALIDATE_SECONDS = 600;

// Dates survive the cache (it stores JSON).
const encode = (v: unknown) => JSON.stringify(v, function (k, x) { const raw = (this as Record<string, unknown>)[k]; return raw instanceof Date ? { __date: raw.toISOString() } : x; });
const decode = <T>(s: string): T => JSON.parse(s, (_k, x) => (x && typeof x === "object" && typeof (x as { __date?: unknown }).__date === "string" && Object.keys(x).length === 1 ? new Date((x as { __date: string }).__date) : x));

/** Cache public (never per-user) data across visitors. Failures are not cached – they throw to the caller. */
export async function cachedPublic<T>(key: string, load: () => Promise<T>): Promise<T> {
  const run = unstable_cache(async () => encode(await load()), ["storefront", key], { revalidate: REVALIDATE_SECONDS, tags: [STOREFRONT_TAG] });
  return decode<T>(await run());
}

// Optional storefront content must not take the homepage down during an outage.
export async function storefrontQuery<T>(
  section: string,
  query: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await cachedPublic(section, query);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        // P2024 = waited too long for a free connection, P2037 = the database has no connection slots left.
        ["P1001", "P1002", "P1011", "P1017", "P2024", "P2037"].includes(error.code))
    ) {
      // Avoid forwarding a Prisma error object (including connection details)
      // into the development browser console.
      console.warn(`[storefront] ${section} unavailable: database connection failed.`);
      return [];
    }
    throw error;
  }
}
