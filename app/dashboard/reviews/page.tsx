import type { Metadata } from "next";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { listReviews, reviewsReady } from "@/app/lib/reviews/reviews";
import { ReviewsManager } from "./ReviewsManager";

export const metadata: Metadata = { title: "Client reviews" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  await requireCatalogueAdmin();
  const db = prismaDb(prisma);
  const ready = await reviewsReady(db);
  const rows = ready ? await listReviews(db) : [];
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;
  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-black">Client reviews</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Reviews clients write in their project page after handover. Approve one to show it on the homepage (only if the client allowed it).{rows.length ? ` ${rows.length} review${rows.length === 1 ? "" : "s"}, average ${avg.toFixed(1)}★.` : ""}</p>
      </header>
      {!ready ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Needs the database update 20261118130000_admin_tools (run <code>npx prisma migrate deploy</code>).</p>
        : <ReviewsManager reviews={rows.map(r => ({ id: r.id, quoteId: r.quoteId, rating: r.rating, title: r.title, body: r.body, displayName: r.displayName, area: r.area, allowPublish: r.allowPublish, status: r.status, reply: r.reply, updatedAt: new Date(r.updatedAt).toISOString(), reference: r.reference ?? "", clientName: r.clientName ?? "", projectTitle: r.projectTitle ?? "" }))} />}
    </div>
  );
}
