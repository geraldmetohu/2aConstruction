import type { Metadata } from "next";
import { InstantQuote } from "./InstantQuote";
import { workPackages } from "@/app/lib/takeoff/modules/index";
import { toSpec } from "@/app/lib/takeoff/package";
import { roomFields } from "@/app/lib/takeoff/modules/rooms";

export const metadata: Metadata = {
  title: "Instant Guide Price – Loft Conversions & Building Work",
  description: "Instant guide prices for loft conversions, extensions, re-roofing and room-by-room work (kitchens, bathrooms, plastering, painting, flooring, electrics), calculated from current material prices, trades, site costs and health & safety.",
  alternates: { canonical: "/instant-quote" },
};
export const dynamic = "force-dynamic";

export default function InstantQuotePage() {
  // Only public field descriptions reach the browser: no prices, rates or formulas.
  return <InstantQuote enabled={process.env.INSTANT_QUOTE_ENABLED === "true"} specs={workPackages.map(p => toSpec(p, true))}
    roomSpec={toSpec({ id: "room", label: "Room", description: "", usesProperty: false, fields: roomFields }, true)} />;
}
