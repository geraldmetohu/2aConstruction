import type { Metadata } from "next";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { authReady, listAccounts } from "@/app/lib/auth/store";
import { db, isAdminAccount } from "@/app/lib/auth/session.server";
import { googleConfigured } from "@/app/lib/auth/google.server";
import { mailConfigured } from "@/app/lib/takeoff/mail.server";
import { defaultRateBook } from "@/app/lib/takeoff/ratebook";
import { tradeKeys } from "@/app/lib/takeoff/schema";
import { AccountsManager } from "./AccountsManager";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireCatalogueAdmin();
  const d = db();
  const ready = await authReady(d);
  const q = ((await searchParams).q ?? "").slice(0, 80);
  const accounts = ready ? await listAccounts(d, q) : [];
  return <AccountsManager ready={ready} q={q} google={googleConfigured()} mail={mailConfigured()}
    trades={tradeKeys.map(k => [k, defaultRateBook.trades[k]?.name ?? k] as [string, string])}
    accounts={accounts.map(a => ({ id: a.id, email: a.email, name: a.name, phone: a.phone, role: a.role, trade: a.trade, admin: isAdminAccount(a), verified: !!a.emailVerifiedAt,
      password: !!a.passwordHash, google: !!a.googleSub, disabled: !!a.disabledAt, lastLoginAt: a.lastLoginAt ? new Date(a.lastLoginAt).toISOString() : null, createdAt: new Date(a.createdAt).toISOString() }))} />;
}
