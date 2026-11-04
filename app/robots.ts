import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private areas: admin, client accounts, worker check-in links and APIs.
        disallow: ["/dashboard", "/api/", "/crew/", "/my-quotes", "/my-projects", "/client-dashboard", "/quotes/", "/premium-estimator"],
      },
    ],
    sitemap: "https://2aconstruction.co.uk/sitemap.xml",
    host: "https://2aconstruction.co.uk",
  };
}
