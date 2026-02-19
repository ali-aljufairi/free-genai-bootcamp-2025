import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Study",
  description: "Start a Japanese study session with Sorami.",
  path: "/study",
  index: true,
})

export default function StudyLayout({ children }: { children: ReactNode }) {
  return children
}
