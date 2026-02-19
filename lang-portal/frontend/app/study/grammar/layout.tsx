import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Study Grammar",
  description: "Practice Japanese grammar activities in Sorami.",
  path: "/study/grammar",
  index: false,
})

export default function StudyGrammarLayout({ children }: { children: ReactNode }) {
  return children
}
