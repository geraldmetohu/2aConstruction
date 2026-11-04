// app/lib/db.ts
import { PrismaClient } from "@prisma/client";

// One Prisma client per server instance (also in production), so each instance keeps a single small
// connection pool. On Vercel, point DATABASE_URL at the DigitalOcean connection pool (PgBouncer) with
// `pgbouncer=true&connection_limit=1` so many instances never exhaust the database's connection slots.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;
