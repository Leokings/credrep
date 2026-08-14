import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return ["/", "/terms", "/privacy", "/support"].map((path) => ({
    url: new URL(path, base).toString(),
    lastModified: new Date("2026-08-14T00:00:00Z"),
    changeFrequency: path === "/" ? "daily" : "monthly",
    priority: path === "/" ? 1 : 0.4,
  }));
}
