import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Word Builder",
  description: "Build and review Japanese words in Sorami.",
  path: "/study/word-builder",
  index: false,
})

export default function StudyWordBuilderLayout({ children }: { children: ReactNode }) {
  return children
}
