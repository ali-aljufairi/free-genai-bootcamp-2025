import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Reading Study",
  description: "Practice Japanese reading sessions in Sorami.",
  path: "/study/reading",
  index: false,
})

export default function StudyReadingLayout({ children }: { children: ReactNode }) {
  return children
}
