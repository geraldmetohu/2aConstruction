// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Important for canonical + absolute social URLs
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"),

  title: {
    default: "2A Construction | London Builders",
    template: "%s | 2A Construction",
  },

  description:
    "London construction specialists for extensions, loft conversions, refurbishments, roofing, and general building. Fully insured. Free quotes.",

  keywords: [
    "construction London",
    "builders London",
    "house extension London",
    "loft conversion London",
    "refurbishment London",
    "roofing contractors London",
    "general building",
    "2A Construction",
  ],

  applicationName: "2A Construction",
  authors: [{ name: "2A Construction" }],
  creator: "2A Construction",
  publisher: "2A Construction",
  category: "Construction",

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

  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: "2A Construction",
    title: "2A Construction | London Builders",
    description:
      "Extensions, lofts, roofing, refurbishments—quality building work across London. Free, no-obligation quotes.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "2A Construction" }],
  },

  twitter: {
    card: "summary_large_image",
    title: "2A Construction | London Builders",
    description:
      "Extensions, lofts, roofing, refurbishments—quality building work across London. Free quotes.",
    images: ["/og.jpg"],
    creator: "@yourhandle",
  },

  // Favicon & icons — put files in /public
  icons: {
    icon: [
      { url: "/favicon.ico" }, // 16x16 or 32x32 .ico
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#0ea5e9" }],
  },

  // ⛔️ Do NOT put themeColor or viewport here (moved to exported `viewport` below)
  // ⛔️ Removed `manifest` here to avoid 404 until you add /app/manifest.ts
};

// Next.js app router wants viewport as a separate export
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
    <html lang="en" className="h-full scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full w-screen m-0 p-0 overflow-x-hidden [--radius:0px]`}
      >
        {/* UploadThing SSR config */}
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />

        {/* JSON-LD: LocalBusiness (Construction) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HomeAndConstructionBusiness",
              name: "2A Construction",
              url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
              telephone: "+44 790 3095 967",
              email: "2aconstruction@gmail.com",
              address: {
                "@type": "PostalAddress",
                addressLocality: "London",
                addressCountry: "GB",
              },
              areaServed: "London",
              image: [`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}/og.jpg`],
              openingHours: "Mo-Fr 08:00-18:00, Sa 09:00-14:00",
              sameAs: [
                "https://www.facebook.com/yourpage",
                "https://www.instagram.com/yourpage",
                "https://www.linkedin.com/company/2a-construction-ltd/?originalSubdomain=uk",
              ],
              priceRange: "££",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "87",
              },
              makesOffer: [
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "House Extensions" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Loft Conversions" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Roofing" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Refurbishments" } },
              ],
            }),
          }}
        />

        {children}
      </body>
    </html>
  );
}
