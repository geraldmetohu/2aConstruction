import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

const baseConfig = {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
};
export default defineConfig(databaseUrl ? { ...baseConfig, engine: "classic", datasource: { url: databaseUrl } } : baseConfig);
