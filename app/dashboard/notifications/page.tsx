import type { Metadata } from "next";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { getNotifications, getSetting, settingsReady } from "@/app/lib/settings/app-settings";
import { senderAddress, siteUrl, type Sender } from "@/app/lib/takeoff/mail.server";
import { NotificationsForm } from "./NotificationsForm";

export const metadata: Metadata = { title: "Emails & notifications" };
export const dynamic = "force-dynamic";

const SENDERS: [Sender, string][] = [["quotes", "Quotes and quote updates"], ["invoices", "Invoices"], ["projects", "Project updates to clients, reminders, review requests"], ["office", "Emails to the office"], ["marketing", "Marketing emails"], ["alerts", "Website error alerts"]];

export default async function NotificationsPage() {
  await requireCatalogueAdmin();
  const db = prismaDb(prisma);
  const ready = await settingsReady(db);
  const [n, token] = await Promise.all([getNotifications(db), getSetting(db, "calendarToken")]);
  const base = siteUrl() || "https://2aconstruction.co.uk";
  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-black">Emails &amp; notifications</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Choose which automatic emails go out. Everything is still shown in the dashboard and the client portal whatever you choose here.</p>
      </header>
      {!ready && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Needs the database update 20261118130000_admin_tools (run <code>npx prisma migrate deploy</code>). Until then the morning list and client reminders are off and portal changes are emailed hourly.</p>}
      <NotificationsForm initial={n} ready={ready} calendarUrl={token ? `${base}/api/calendar/${token}.ics` : null} />
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Who emails come from</h2>
        <p className="mt-1 text-sm text-neutral-600">All on your verified domain, so Resend sends them at no extra cost. Replies go to the office inbox unless you set up those mailboxes. Change any with a MAIL_FROM_… setting in Vercel (e.g. MAIL_FROM_INVOICES).</p>
        <table className="mt-3 w-full text-sm"><tbody>{SENDERS.map(([k, what]) => <tr key={k} className="border-t"><td className="py-2 pr-3 text-neutral-600">{what}</td><td className="py-2 font-mono text-xs">{senderAddress(k)}</td></tr>)}</tbody></table>
      </section>
    </div>
  );
}
