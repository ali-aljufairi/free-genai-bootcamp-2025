import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Kanji Study",
  description: "Practice kanji study activities in Sorami.",
  path: "/study/kanji",
  index: false,
})

export default function StudyKanjiLayout({ children }: { children: ReactNode }) {
  return children
}
