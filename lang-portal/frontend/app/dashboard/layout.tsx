import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Dashboard",
  description: "View your Sorami learning progress and activity dashboard.",
  path: "/dashboard",
  index: false,
})

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children
}
