import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Groups",
  description: "Organize your vocabulary and kanji into study groups.",
  path: "/groups",
  index: false,
})

export default function GroupsLayout({ children }: { children: ReactNode }) {
  return children
}
