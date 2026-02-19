import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Word Flashcards",
  description: "Practice word flashcards in Sorami.",
  path: "/study/flashcards/words",
  index: false,
})

export default function StudyWordFlashcardsLayout({ children }: { children: ReactNode }) {
  return children
}
