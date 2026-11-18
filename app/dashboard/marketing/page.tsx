import type { Metadata } from "next";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { senderAddress } from "@/app/lib/takeoff/mail.server";
import { marketingContacts, marketingReady } from "@/app/lib/marketing/contacts";
import { listCampaigns, listTemplates, recentlyEmailed } from "@/app/lib/marketing/campaigns";
import { STARTER_TEMPLATES } from "@/app/lib/marketing/templates";
import { marketingConfigured } from "@/app/lib/marketing/resend.server";
import { MarketingStudio } from "./MarketingStudio";

export const metadata: Metadata = { title: "Marketing emails" };
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  await requireCatalogueAdmin();
  const db = prismaDb(prisma);
  const tables = await marketingReady(db);
  const [contacts, saved, campaigns, recent] = await Promise.all([
    marketingContacts(db), tables ? listTemplates(db) : [], tables ? listCampaigns(db) : [], tables ? recentlyEmailed(db, 14) : new Map<string, Date>(),
  ]);
  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-black">Marketing emails</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Pick a ready-made email (or write your own), choose who gets it, and send. Sent through Resend&apos;s marketing broadcasts – free for up to 1,000 contacts and separate from your quote and invoice emails. Every email carries your company details and a one-click unsubscribe.</p>
      </header>
      <MarketingStudio starters={STARTER_TEMPLATES} from={senderAddress("marketing")} setup={{ tables, resend: marketingConfigured() }}
        saved={saved.map(t => ({ id: t.id, name: t.name, content: t.content }))} contacts={contacts}
        campaigns={campaigns.map(c => ({ id: c.id, name: c.name, subject: c.subject, recipients: c.recipients, status: c.status, error: c.error, createdBy: c.createdBy, fromAddress: c.fromAddress, createdAt: new Date(c.createdAt).toISOString(), sentAt: c.sentAt ? new Date(c.sentAt).toISOString() : null }))}
        recent={Object.fromEntries([...recent].map(([e, d]) => [e, new Date(d).toISOString()]))} />
    </div>
  );
}
