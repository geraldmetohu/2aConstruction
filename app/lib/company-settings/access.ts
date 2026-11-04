import "server-only";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { SettingsError } from "./schema";
export const companySettingsEnabled = () => process.env.COMPANY_SETTINGS_ENABLED === "true";
export async function requireSettingsAdmin() { const actor = await requireCatalogueAdmin(); if (!companySettingsEnabled()) throw new SettingsError("Company settings are not enabled yet."); return actor; }
