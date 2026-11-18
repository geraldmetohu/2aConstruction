import "server-only";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { brandEmail, mailConfigured, sendMail, siteUrl } from "@/app/lib/takeoff/mail.server";
import { errorLogReady, recordError, type ErrorInput } from "./error-log";

// Never let error reporting cause more errors: one report at a time per kind, short-circuit when busy.
let inFlight = 0;
const recent = new Map<string, number>();

/** Who gets error emails: ERROR_ALERTS_TO, else ADMIN_EMAILS. */
const alertInbox = () => [...new Set((process.env.ERROR_ALERTS_TO || process.env.ADMIN_EMAILS || "").split(/[,;\s]+/).filter(Boolean))];

/** Log an error and email the admins the first time it happens (and again if still happening 6 h later). Never throws. */
export async function reportError(e: ErrorInput) {
  if (inFlight > 5) return;
  // A cheap per-instance guard against loops (same message more than 30 times a minute is just counted later).
  const key = `${e.source}|${e.message.slice(0, 120)}|${e.path ?? ""}`, now = Date.now();
  for (const [k, t] of recent) if (now - t > 60_000) recent.delete(k);
  if ((recent.get(key) ?? 0) > now - 2_000) return;
  recent.set(key, now);
  inFlight++;
  try {
    const db = prismaDb(prisma);
    if (!(await errorLogReady(db))) { console.error("[error]", e.source, e.path, e.message); return; }
    const { row, email } = await recordError(db, e);
    const to = alertInbox();
    if (!email || !to.length || !mailConfigured()) return;
    const base = siteUrl() || "https://2aconstruction.co.uk";
    await sendMail({
      from: "alerts", to, subject: `Website error: ${row.message.slice(0, 90)}`,
      ...brandEmail({
        heading: row.count > 1 ? `An error is still happening (${row.count} times)` : "Something went wrong on the website",
        paragraphs: [
          `Where: ${row.method ? `${row.method} ` : ""}${row.path || "(unknown page)"} – ${row.source === "browser" ? "in a visitor's browser" : "on the server"}.`,
          `Error: ${row.message.slice(0, 500)}`,
          row.digest ? `Vercel log reference (digest): ${row.digest}` : "",
          row.stack ? `First lines of the stack: ${row.stack.split("\n").slice(0, 4).join(" | ").slice(0, 600)}` : "",
          "You'll get at most one email about this every 6 hours. Mark it fixed on the Errors page once it's sorted.",
        ].filter(Boolean),
        button: { label: "Open the Errors page", url: `${base}/dashboard/errors` },
      }),
    });
  } catch (err) {
    console.error("[error-report] could not record", err instanceof Error ? err.message : err);
  } finally { inFlight--; }
}
