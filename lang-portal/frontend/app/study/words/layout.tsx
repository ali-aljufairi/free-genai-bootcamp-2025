import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Words Study",
  description: "Practice Japanese word study activities in Sorami.",
  path: "/study/words",
  index: false,
})

export default function StudyWordsLayout({ children }: { children: ReactNode }) {
  return children
}
