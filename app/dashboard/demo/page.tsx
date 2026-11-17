import type { Metadata } from "next";
import Link from "next/link";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { db } from "@/app/lib/auth/session.server";
import { accountByEmail, authReady } from "@/app/lib/auth/store";
import { getQuote, storageReady } from "@/app/lib/takeoff/store";
import { demoDone, demoQuoteId, DEMO_EMAIL, DEMO_STEPS } from "@/app/lib/takeoff/demo.server";
import { deletesEnabled } from "@/app/lib/takeoff/delete-store";
import { DemoControls } from "./DemoControls";

export const metadata: Metadata = { title: "Client portal demo" };
export const dynamic = "force-dynamic";

export default async function DemoPage() {
  await requireCatalogueAdmin();
  const d = db();
  const ready = (await storageReady(d)) && (await authReady(d));
  const id = ready ? await demoQuoteId(d) : null;
  const [account, done, quote, canReset] = ready ? await Promise.all([accountByEmail(d, DEMO_EMAIL), id ? demoDone(d, id) : 0, id ? getQuote(d, id) : null, deletesEnabled(d)]) : [null, 0, null, false];
  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-black">Client portal demo</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Show a client exactly what they get: a sample loft project you move through a real job, one button at a time – quote, acceptance, messages, questions, invoices, photos, progress and the 3D build view, snagging and handover. When you&apos;re done, reset it for the next client.</p>
      </header>
      {!ready ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">The demo needs the quotes and logins database tables (migrations 20261101120000 and 20261111120000).</p> : (
        <DemoControls email={DEMO_EMAIL} hasLogin={!!account?.passwordHash} done={done} steps={DEMO_STEPS} canReset={canReset}
          quote={quote ? { id: quote.quote.id, reference: quote.quote.reference, status: quote.quote.status } : null} />
      )}
      {quote && <p className="text-sm text-neutral-600">Demo project: <Link className="font-semibold text-amber-700 underline" href={quote.quote.status === "ACCEPTED" ? `/dashboard/jobs/${quote.quote.id}` : `/dashboard/calculator?quote=${quote.quote.id}`}>{quote.quote.reference}</Link> – it&apos;s marked as a demo and is the only thing Reset deletes.</p>}
    </div>
  );
}
