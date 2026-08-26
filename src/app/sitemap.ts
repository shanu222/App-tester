import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/privacy", "/terms", "/contact", "/about"].map((path) => ({
    url: `${SITE_ORIGIN}${path || "/"}`,
    lastModified: new Date("2026-08-27"),
    changeFrequency: path ? "monthly" : "weekly",
    priority: path ? 0.6 : 1,
  }));
}
