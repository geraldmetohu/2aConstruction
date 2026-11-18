import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { cachedPublic } from "@/app/lib/storefront-query";
import { publishedReviews } from "@/app/lib/reviews/reviews";
import Testimonials, { type TestimonialReview } from "./Testimonials";

/** The testimonials carousel, with the latest approved client reviews from the portal first. */
export default async function TestimonialsSection() {
  const rows = await cachedPublic("reviews", () => publishedReviews(prismaDb(prisma), 8)).catch(() => []);
  const fromClients: TestimonialReview[] = rows.map(r => ({
    source: "2A Construction client", sourceLabel: "Verified client – project completed", rating: `${r.rating * 2}/10`,
    quote: r.title ? `${r.title}. ${r.body}` : r.body, name: r.displayName, location: r.area, href: "/portfolio/all",
  }));
  return <Testimonials fromClients={fromClients} />;
}
