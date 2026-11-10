import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
