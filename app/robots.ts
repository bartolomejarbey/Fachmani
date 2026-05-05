import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.cz").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/auth/",
          "/payment/",
          "/zpravy/",
          "/predplatne",
          "/nova-poptavka",
          "/overeni",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap-index.xml`,
    host: SITE_URL,
  };
}
