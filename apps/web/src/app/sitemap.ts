import type { MetadataRoute } from "next";
import { getPublishedApps } from "./(marketing)/_lib/data";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3400";
const PAGES = ["/", "/solutions", "/apps", "/pricing", "/news", "/faq", "/benchmark", "/resources", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date("2026-09-12");

  const staticPages: MetadataRoute.Sitemap = PAGES.map((p) => ({
    url: `${BASE}${p}`,
    lastModified,
    changeFrequency: p === "/resources" ? "daily" : "weekly",
    priority: p === "/" ? 1 : 0.8,
  }));

  // Each published app page is its own SEO/GEO asset (Master §7).
  const apps = await getPublishedApps();
  const appPages: MetadataRoute.Sitemap = apps.map((a) => ({
    url: `${BASE}/apps/${a.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...appPages];
}
