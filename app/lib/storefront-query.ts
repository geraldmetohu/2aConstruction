import { Prisma } from "@prisma/client";

// Optional storefront content must not take the homepage down during an outage.
export async function storefrontQuery<T>(
  section: string,
  query: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await query();
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
