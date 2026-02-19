import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Grammar Detail",
  description: "Review a specific grammar point in Sorami.",
  path: "/grammar",
  index: false,
  canonical: false,
})

export default function GrammarDetailLayout({ children }: { children: ReactNode }) {
  return children
}
