import type { ReactNode } from "react"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
  title: "Sign Up",
  description: "Create a Sorami account and start learning Japanese.",
  path: "/sign-up",
  index: false,
})

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children
}
