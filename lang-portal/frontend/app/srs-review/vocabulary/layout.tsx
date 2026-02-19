import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "SRS Vocabulary",
  description: "Review vocabulary spaced repetition cards in Sorami.",
  path: "/srs-review/vocabulary",
  index: false,
})

export default function SrsReviewVocabularyLayout({ children }: { children: ReactNode }) {
  return children
}
