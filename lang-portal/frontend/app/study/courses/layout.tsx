import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Study Courses",
  description: "Explore available study courses in Sorami.",
  path: "/study/courses",
  index: false,
})

export default function StudyCoursesLayout({ children }: { children: ReactNode }) {
  return children
}
