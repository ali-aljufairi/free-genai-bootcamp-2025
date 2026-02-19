import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Kanji Flashcards",
  description: "Practice kanji flashcards in Sorami.",
  path: "/study/flashcards/kanji",
  index: false,
})

export default function StudyKanjiFlashcardsLayout({ children }: { children: ReactNode }) {
  return children
}
