// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";
import { AREAS, SITE_URL } from "./lib/seo/areas";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://2aconstruction.co.uk"),
  title: {
    default: "2A Construction | Builders in London, North London & the South East",
    template: "%s | 2A Construction",
  },
  description:
    "2A Construction Ltd builds house extensions, loft conversions, refurbishments and roofs across London, North London (Enfield, Barnet, Haringey, Islington, Camden, Hackney, Waltham Forest) and the South East. FMB member, SafeContractor approved, itemised quotes, 5-year guarantee. Free site visits.",
  keywords: [
    "2A Construction",
    "builders London",
    "builders North London",
    "builders South East England",
    "house extensions London",
    "loft conversions North London",
    "kitchen extension Enfield",
    "loft conversion Barnet",
    "builders Haringey",
    "builders Islington",
    "builders Camden",
    "builders Walthamstow",
    "builders Hertfordshire",
    "builders Essex",
    "refurbishment London",
    "roofing North London",
    "FMB builder London",
  ],
  applicationName: "2A Construction",
  authors: [{ name: "2A Construction" }],
  creator: "2A Construction",
  publisher: "2A Construction",
  category: "Construction",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: "2A Construction",
    title: "2A Construction | Builders in London, North London & the South East",
    description:
      "House extensions, loft conversions, refurbishments and roofing across London, North London and the South East. FMB member, itemised quotes and a 5-year guarantee.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "2A Construction - North London Builders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "2A Construction | Builders in London, North London & the South East",
    description:
      "House extensions, loft conversions, refurbishments and roofing across London, North London and the South East.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#0ea5e9" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className="h-full scroll-smooth">
      <body
        suppressHydrationWarning
        className={[
          geistSans.variable,
          geistMono.variable,
          "antialiased h-full w-full m-0 p-0 overflow-x-hidden [--radius:14px] bg-white dark:bg-neutral-950",
          "relative",
          "before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:opacity-[0.85]",
          "before:bg-[radial-gradient(60rem_40rem_at_top_right,rgba(245,158,11,0.12),transparent),radial-gradient(50rem_40rem_at_-10%_120%,rgba(6,182,212,0.10),transparent)]",
          "after:pointer-events-none after:fixed after:inset-0 after:-z-10 after:opacity-[0.06]",
          "after:bg-[linear-gradient(transparent_31px,rgba(0,0,0,0.08)_32px),linear-gradient(90deg,transparent_31px,rgba(0,0,0,0.08)_32px)] after:bg-[length:32px_32px]",
        ].join(" ")}
      >
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "HomeAndConstructionBusiness",
                "@id": `${SITE_URL}/#business`,
                name: "2A Construction",
                legalName: "2A Construction Ltd",
                url: SITE_URL,
                logo: `${SITE_URL}/2a_l.png`,
                image: [`${SITE_URL}/og.jpg`],
                telephone: "+44 7903 095967",
                email: "2a.construction.uk@gmail.com",
                priceRange: "££",
                address: { "@type": "PostalAddress", addressLocality: "London", addressRegion: "Greater London", addressCountry: "GB" },
                areaServed: AREAS.map(a => ({ "@type": a.kind === "county" ? "AdministrativeArea" : "Place", name: a.name.replace(/^the /, ""), url: `${SITE_URL}/areas/${a.slug}` })),
                openingHoursSpecification: [
                  { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "18:00" },
                  { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "14:00" },
                ],
                memberOf: { "@type": "Organization", name: "Federation of Master Builders", url: "https://www.fmb.org.uk/" },
                knowsAbout: ["House extensions", "Loft conversions", "Dormer lofts", "Hip-to-gable lofts", "Refurbishments", "Roofing", "Kitchen extensions", "Building Control", "Party wall"],
                hasOfferCatalog: {
                  "@type": "OfferCatalog",
                  name: "Building services",
                  itemListElement: ["House extensions", "Loft conversions", "Refurbishments", "Roofing", "General building", "Painting and decorating", "Flooring", "Plumbing and heating", "Electrical"].map(n => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n, areaServed: "London and the South East" } })),
                },
                sameAs: [
                  "https://www.facebook.com/2A.Construction.WA/",
                  "https://www.instagram.com/2a.construction.ltd/",
                  "https://uk.linkedin.com/company/2a-construction-ltd",
                  "https://www.checkatrade.com/trades/2aconstructionltd",
                  "https://www.fmb.org.uk/builder/2a-construction-ltd.html",
                ],
              },
              { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "2A Construction", url: SITE_URL, publisher: { "@id": `${SITE_URL}/#business` }, inLanguage: "en-GB" },
            ]),
          }}
        />

        <div className="relative">
          <div className="pointer-events-none fixed inset-x-0 top-0 h-[16rem] -z-10 bg-gradient-to-b from-black/15 to-transparent dark:from-black/30" />
          {children}
        </div>
      </body>
    </html>
  );
}