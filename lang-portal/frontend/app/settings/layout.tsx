import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Settings",
  description: "Manage your Sorami account and preferences.",
  path: "/settings",
  index: false,
})

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children
}
