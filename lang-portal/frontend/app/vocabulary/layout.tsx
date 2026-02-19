import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Vocabulary",
  description: "Browse and review vocabulary cards in Sorami.",
  path: "/vocabulary",
  index: false,
})

export default function VocabularyLayout({ children }: { children: ReactNode }) {
  return children
}
