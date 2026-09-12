import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3400";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/solutions", "/apps", "/pricing", "/faq", "/resources"], disallow: ["/api/", "/chat", "/dashboard", "/my-apps", "/models", "/graph", "/settings", "/admin", "/onboarding", "/preview"] }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
