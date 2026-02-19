import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Grammar",
  description: "Browse grammar points and track your learning progress.",
  path: "/grammar",
  index: false,
})

export default function GrammarLayout({ children }: { children: ReactNode }) {
  return children
}
