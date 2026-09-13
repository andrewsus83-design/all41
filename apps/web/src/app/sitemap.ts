import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3400";
const PAGES = ["/", "/solutions", "/apps", "/pricing", "/faq", "/benchmark", "/resources"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-12");
  return PAGES.map((p) => ({ url: `${BASE}${p}`, lastModified, changeFrequency: p === "/resources" ? "daily" : "weekly", priority: p === "/" ? 1 : 0.8 }));
}
