import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Sign In",
  description: "Sign in to your Sorami account.",
  path: "/sign-in",
  index: false,
})

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children
}
