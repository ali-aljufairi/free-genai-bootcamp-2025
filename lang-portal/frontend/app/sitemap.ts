import { MetadataRoute } from "next"
import { SEO_BASE_URL } from "@/lib/seo/metadata"

const LAST_MODIFIED = new Date("2026-02-19T00:00:00.000Z")

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SEO_BASE_URL,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SEO_BASE_URL}/pricing`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SEO_BASE_URL}/study`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SEO_BASE_URL}/terms`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SEO_BASE_URL}/privacy`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SEO_BASE_URL}/business-info`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ]
}
