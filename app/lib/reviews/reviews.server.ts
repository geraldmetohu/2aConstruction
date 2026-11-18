import "server-only";
import { brandEmail, mailConfigured, sendMail, siteUrl } from "@/app/lib/takeoff/mail.server";
import type { Sql } from "@/app/lib/takeoff/store";
import { dueReviewRequests, markReviewRequested } from "./reviews";

const first = (n: string) => n.trim().split(/\s+/)[0] || "there";

/** Ask each client for a review a week after handover (once). Returns how many were emailed. */
export async function sendReviewRequests(db: Sql): Promise<number> {
  if (!mailConfigured()) return 0;
  const base = siteUrl() || "https://2aconstruction.co.uk";
  const checkatrade = process.env.REVIEW_LINK_CHECKATRADE || "https://www.checkatrade.com/trades/2aconstructionltd/reviews";
  const google = process.env.REVIEW_LINK_GOOGLE || "";
  let sent = 0;
  for (const j of await dueReviewRequests(db, 7)) {
    const r = await sendMail({
      from: "projects", to: j.clientEmail, subject: `How did we do? (${j.reference})`,
      ...brandEmail({
        heading: `Hi ${first(j.clientName)}, how did we do?`,
        paragraphs: [
          "It's been a week since we finished your project – we hope you're enjoying it.",
          "Would you spare two minutes to tell us how it went? Your review helps other families choose a builder they can trust, and it means a lot to our small team.",
          `You can also leave one on Checkatrade${google ? " or Google" : ""}: ${checkatrade}${google ? ` · ${google}` : ""}`,
          "Anything not quite right? Add it to your snagging list in your project page and we'll put it right.",
        ],
        button: { label: "Write a review", url: `${base}/my-quotes/${j.quoteId}?tab=review` },
        footnote: `Reference ${j.reference}.`,
      }),
    });
    if (r.sent) { await markReviewRequested(db, j.quoteId); sent++; }
  }
  return sent;
}
