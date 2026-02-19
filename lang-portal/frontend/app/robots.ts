import { MetadataRoute } from "next"
import { SEO_BASE_URL } from "@/lib/seo/metadata"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/study"],
        disallow: [
          "/api",
          "/sign-in",
          "/sign-up",
          "/sso-callback",
          "/settings",
          "/dashboard",
          "/groups",
          "/vocabulary",
          "/grammar",
          "/srs-review",
          "/study/",
          "/study/*",
        ],
      },
    ],
    sitemap: `${SEO_BASE_URL}/sitemap.xml`,
  }
}





