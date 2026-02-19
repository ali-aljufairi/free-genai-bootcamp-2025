import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Flashcards",
  description: "Practice with Sorami flashcards.",
  path: "/study/flashcards",
  index: false,
})

export default function StudyFlashcardsLayout({ children }: { children: ReactNode }) {
  return children
}
