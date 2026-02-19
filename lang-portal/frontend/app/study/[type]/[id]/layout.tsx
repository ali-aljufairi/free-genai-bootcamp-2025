import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Study Session",
  description: "Active Sorami study session.",
  path: "/study",
  index: false,
  canonical: false,
})

export default function StudySessionLayout({ children }: { children: ReactNode }) {
  return children
}
