// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";

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
    default: "2A Construction | Loft Conversions, Extensions & Roofing in North London",
    template: "%s | 2A Construction",
  },
  description:
    "2A Construction provides loft conversions, house extensions, roofing, refurbishments and general building services across North London, including Enfield, Barnet and Walthamstow. Fully insured. Free quotes.",
  keywords: [
    "2A Construction",
    "builders north london",
    "loft conversions north london",
    "loft conversion enfield",
    "loft conversion barnet",
    "builders enfield",
    "builders barnet",
    "builders walthamstow",
    "roofing north london",
    "house extensions north london",
    "refurbishments north london",
    "general building london",
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
    title: "2A Construction | Loft Conversions, Extensions & Roofing in North London",
    description:
      "Trusted North London builders for loft conversions, house extensions, roofing and refurbishments in Enfield, Barnet, Walthamstow and surrounding areas.",
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
    title: "2A Construction | Loft Conversions, Extensions & Roofing in North London",
    description:
      "Trusted North London builders for loft conversions, house extensions, roofing and refurbishments.",
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
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HomeAndConstructionBusiness",
              name: "2A Construction",
              url: "https://2aconstruction.co.uk",
              logo: "https://2aconstruction.co.uk/og.jpg",
              image: ["https://2aconstruction.co.uk/og.jpg"],
              telephone: "+44 790 3095 967",
              email: "2a.construction.uk@gmail.com",
              priceRange: "££",
              address: {
                "@type": "PostalAddress",
                addressLocality: "London",
                addressCountry: "GB",
              },
              areaServed: [
                "North London",
                "Enfield",
                "Barnet",
                "Walthamstow",
                "London",
              ],
              openingHours: "Mo-Fr 08:00-18:00, Sa 09:00-14:00",
              sameAs: [
                "https://www.linkedin.com/company/2a-construction-ltd/?originalSubdomain=uk",
              ],
              makesOffer: [
                {
                  "@type": "Offer",
                  itemOffered: { "@type": "Service", name: "Loft Conversions" },
                },
                {
                  "@type": "Offer",
                  itemOffered: { "@type": "Service", name: "House Extensions" },
                },
                {
                  "@type": "Offer",
                  itemOffered: { "@type": "Service", name: "Roofing" },
                },
                {
                  "@type": "Offer",
                  itemOffered: { "@type": "Service", name: "Refurbishments" },
                },
                {
                  "@type": "Offer",
                  itemOffered: { "@type": "Service", name: "General Building" },
                },
              ],
            }),
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