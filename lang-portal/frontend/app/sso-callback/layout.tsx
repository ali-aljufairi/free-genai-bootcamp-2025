import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "SSO Callback",
  description: "Completing sign-in and session setup.",
  path: "/sso-callback",
  index: false,
})

export default function SsoCallbackLayout({ children }: { children: ReactNode }) {
  return children
}
