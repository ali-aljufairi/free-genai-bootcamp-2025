import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Companion Study Session",
  description: "Active AI companion study session in Sorami.",
  path: "/study/companion-study",
  index: false,
  canonical: false,
})

export default function CompanionStudySessionLayout({ children }: { children: ReactNode }) {
  return children
}
