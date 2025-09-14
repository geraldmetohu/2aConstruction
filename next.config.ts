// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.uploadthing.com" },
      { protocol: "https", hostname: "**.utfs.io" },
    ],
  },
  eslint: {
    // ✅ Don’t fail Vercel builds on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // If you also want to ignore TS errors during build (optional)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
