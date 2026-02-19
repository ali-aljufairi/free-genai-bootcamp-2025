import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "SRS Grammar",
  description: "Review grammar spaced repetition cards in Sorami.",
  path: "/srs-review/grammar",
  index: false,
})

export default function SrsReviewGrammarLayout({ children }: { children: ReactNode }) {
  return children
}
