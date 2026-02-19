import { setupClerkTestingToken } from "@clerk/testing/playwright"
import { expect, test } from "@playwright/test"

const SITE_URL = "https://sorami.aljufairi.org"

const INDEXABLE_ROUTES = [
  { route: "/", title: "Sorami", canonical: `${SITE_URL}/` },
  { route: "/pricing", title: "Pricing", canonical: `${SITE_URL}/pricing` },
  { route: "/terms", title: "Terms", canonical: `${SITE_URL}/terms` },
  { route: "/privacy", title: "Privacy", canonical: `${SITE_URL}/privacy` },
  {
    route: "/business-info",
    title: "Business Info",
    canonical: `${SITE_URL}/business-info`,
  },
  { route: "/study", title: "Study", canonical: `${SITE_URL}/study` },
] as const

const PUBLIC_NOINDEX_ROUTES = [
  { route: "/sign-in", title: "Sign In" },
  { route: "/sign-up", title: "Sign Up" },
] as const

function normalizeCanonical(url: string | null): string {
  if (!url) {
    return ""
  }

  if (url.endsWith("/")) {
    return url.slice(0, -1)
  }

  return url
}

test.describe("SEO metadata", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test("indexable routes have unique short titles, index robots, and canonical URLs", async ({ page }) => {
    const seenTitles = new Set<string>()

    for (const target of INDEXABLE_ROUTES) {
      await page.goto(target.route)

      await expect(page).toHaveTitle(target.title)
      expect(target.title.includes("|"), `title for ${target.route} should be page-only`).toBe(false)

      const robots = (await page.locator('meta[name="robots"]').first().getAttribute("content"))?.toLowerCase() ?? ""
      expect(robots, `robots content should mark ${target.route} as indexable`).toContain("index")
      expect(robots, `robots content should mark ${target.route} as indexable`).toContain("follow")
      expect(robots, `robots content should not mark ${target.route} as noindex`).not.toContain("noindex")

      const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href")
      expect(normalizeCanonical(canonical)).toBe(normalizeCanonical(target.canonical))

      const title = await page.title()
      expect(seenTitles.has(title), `duplicate title detected: ${title}`).toBe(false)
      seenTitles.add(title)
    }
  })

  test("public auth/callback routes are noindex with unique titles", async ({ page }) => {
    const seenTitles = new Set<string>()

    for (const target of PUBLIC_NOINDEX_ROUTES) {
      await page.goto(target.route)

      await expect(page).toHaveTitle(target.title)

      const robots = (await page.locator('meta[name="robots"]').first().getAttribute("content"))?.toLowerCase() ?? ""
      expect(robots, `robots content should mark ${target.route} as noindex`).toContain("noindex")
      expect(robots, `robots content should mark ${target.route} as noindex`).toContain("nofollow")

      const title = await page.title()
      expect(seenTitles.has(title), `duplicate title detected: ${title}`).toBe(false)
      seenTitles.add(title)
    }
  })

  test("sso callback route is marked noindex in server-rendered metadata", async ({ page }) => {
    const response = await page.request.get("/sso-callback")
    expect(response.ok()).toBe(true)

    const body = (await response.text()).toLowerCase()
    expect(body).toContain("<title>sso callback</title>")
    expect(body).toContain("name=\"robots\"")
    expect(body).toContain("noindex")
    expect(body).toContain("nofollow")
  })

  test("legal and business pages use stable last-updated dates", async ({ page }) => {
    for (const route of ["/terms", "/privacy", "/business-info"] as const) {
      await page.goto(route)
      await expect(page.locator("text=Last updated: February 19, 2026")).toBeVisible()
    }
  })

  test("robots.txt allows /study but blocks protected and dynamic study paths", async ({ page }) => {
    const response = await page.request.get("/robots.txt")
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).toContain("Allow: /study")
    expect(body).toContain("Disallow: /study/")
    expect(body).toContain("Disallow: /dashboard")
    expect(body).toContain("Disallow: /sign-in")
    expect(body).toContain("Disallow: /sign-up")
    expect(body).toContain("Disallow: /settings")
  })

  test("sitemap includes only approved indexable routes", async ({ page }) => {
    const response = await page.request.get("/sitemap.xml")
    expect(response.ok()).toBe(true)

    const body = await response.text()

    for (const target of INDEXABLE_ROUTES) {
      const url = target.route === "/" ? SITE_URL : `${SITE_URL}${target.route}`
      expect(body).toContain(`<loc>${url}</loc>`)
    }

    for (const excluded of [
      `${SITE_URL}/dashboard`,
      `${SITE_URL}/groups`,
      `${SITE_URL}/vocabulary`,
      `${SITE_URL}/grammar`,
      `${SITE_URL}/study/flashcards`,
      `${SITE_URL}/study/word-builder`,
    ]) {
      expect(body).not.toContain(`<loc>${excluded}</loc>`)
    }
  })
})
