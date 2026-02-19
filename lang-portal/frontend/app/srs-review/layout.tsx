import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "SRS Review",
  description: "Review spaced repetition items in Sorami.",
  path: "/srs-review",
  index: false,
})

export default function SrsReviewLayout({ children }: { children: ReactNode }) {
  return children
}
