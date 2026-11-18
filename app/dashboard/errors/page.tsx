import type { Metadata } from "next";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { errorLogReady, listErrors } from "@/app/lib/errors/error-log";
import { resolveErrorAction } from "./actions";

export const metadata: Metadata = { title: "Website errors" };
export const dynamic = "force-dynamic";

const when = (d: Date) => new Date(d).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireCatalogueAdmin();
  const all = (await searchParams).all === "1";
  const db = prismaDb(prisma);
  const ready = await errorLogReady(db);
  const rows = ready ? await listErrors(db, { open: !all, limit: 200 }) : [];
  const inbox = process.env.ERROR_ALERTS_TO || process.env.ADMIN_EMAILS || "";
  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Website errors</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">Anything that breaks on the website or in the dashboard – on the server or in someone&apos;s browser – is listed here, grouped so the same problem is one line. {inbox ? <>Alerts go to <strong>{inbox.split(/[,;\s]+/).filter(Boolean).join(", ")}</strong>, at most once every 6 hours per problem.</> : <>Set ERROR_ALERTS_TO (or ADMIN_EMAILS) to get alert emails.</>}</p>
        </div>
        <a href={all ? "?" : "?all=1"} className="rounded-full border px-3 py-1.5 text-sm font-semibold">{all ? "Show open only" : "Show fixed too"}</a>
      </header>
      {!ready && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Needs the database update 20261118130000_admin_tools (run <code>npx prisma migrate deploy</code>). Until then errors only go to the Vercel logs.</p>}
      {ready && !rows.length && <p className="rounded-xl border bg-white p-6 text-sm text-neutral-600">{all ? "No errors recorded." : "No open errors – everything is working."}</p>}
      <ul className="space-y-3">{rows.map(r => (
        <li key={r.id} className={`rounded-xl border bg-white p-4 ${r.resolvedAt ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-red-800">{r.message.slice(0, 300)}</p>
              <p className="mt-0.5 text-xs text-neutral-600">{r.source === "browser" ? "Browser" : "Server"} · {r.method ? `${r.method} ` : ""}{r.path || "(unknown page)"} · {r.count} time{r.count === 1 ? "" : "s"} · first {when(r.firstAt)} · last {when(r.lastAt)}{r.digest ? ` · ref ${r.digest}` : ""}</p>
            </div>
            {!r.resolvedAt ? <form action={resolveErrorAction.bind(null, r.id)}><button className="rounded-full border px-3 py-1.5 text-xs font-bold">Mark fixed</button></form> : <span className="text-xs font-semibold text-emerald-700">Fixed {when(r.resolvedAt)}</span>}
          </div>
          {r.stack && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-neutral-500">Technical detail</summary><pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-neutral-950 p-3 text-[11px] leading-relaxed text-neutral-100">{r.stack}</pre></details>}
        </li>))}</ul>
    </div>
  );
}
