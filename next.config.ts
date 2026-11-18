import type { NextConfig } from "next";

// Standard browser protections on every page and file. Chosen so nothing on the site breaks: the site can still
// frame its own PDFs and use the camera / location on the team check-in page; no other site can frame ours.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https://accounts.google.com" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  serverExternalPackages: ["pdfkit"],
  // Fonts for the PDF quotes (pdfkit reads them from disk at run time).
  outputFileTracingIncludes: {
    "/api/quotes/**": ["./app/lib/quotes/fonts/*"],
    "/dashboard/calculator": ["./app/lib/quotes/fonts/*"],
    "/dashboard/calculator/**": ["./app/lib/quotes/fonts/*"],
    "/my-quotes/**": ["./app/lib/quotes/fonts/*"],
    // Invoice PDFs: raised from the job pages, the client portal and the daily job.
    "/dashboard/jobs/**": ["./app/lib/quotes/fonts/*"],
    "/api/jobs/**": ["./app/lib/quotes/fonts/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.uploadthing.com", // optional — allows subdomains like sea1.ingest.uploadthing.com
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh", // uploadthing v7 file URLs
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
