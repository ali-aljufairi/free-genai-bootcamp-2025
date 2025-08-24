"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs"

// Common appearance settings for Clerk modals
export const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    card: "bg-[#0A1120] border border-blue-900/30 shadow-2xl",
    modalBackdrop: "backdrop-blur-md bg-black/60",
    modalContent: "bg-transparent",
    headerTitle: "text-white font-bold text-2xl",
    headerSubtitle: "text-blue-200/70",
    formFieldLabel: "text-blue-100/90 font-medium",
    formFieldInput: "bg-[#1A2333] text-white border-blue-900/50 placeholder:text-blue-300/30 focus:border-blue-500/50 focus:ring-blue-500/20",
    formButtonPrimary: "bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium shadow-lg shadow-blue-900/20",
    formButtonReset: "text-blue-200/70 hover:text-blue-100",
    footerActionLink: "text-blue-400 hover:text-blue-300 font-medium",
    footerActionText: "text-blue-200/70",
    identityPreview: "bg-[#1A2333] border-blue-900/50",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-blue-200/70 hover:text-blue-100",
    formFieldLabelRow: "text-blue-100/90",
    socialButtonsBlockButton: "bg-[#1A2333] text-white border-blue-900/50 hover:bg-[#243044] h-12",
    socialButtonsBlockButtonText: "text-white font-medium text-base",
    socialButtonsBlockButtonArrow: "text-blue-200/70",
    dividerLine: "bg-blue-900/50",
    dividerText: "text-blue-200/70",
    formFieldError: "text-red-400",
    formFieldSuccess: "text-green-400",
    formFieldWarning: "text-yellow-400",
    formFieldInfo: "text-blue-400",
    card__main: "gap-6",
    footer: "bg-[#0A1120] border-t border-blue-900/30",
    footerText: "text-blue-200/70",
    alternativeMethodsBlockButton: "bg-[#1A2333] hover:bg-[#243044] border-blue-900/30",
    navbar: "hidden",
    navbarButton: "hidden",
    main: "bg-[#0A1120]",
    page: "bg-[#0A1120]",
    socialButtonsIconButton: "!text-white filter brightness-100 contrast-100 w-6 h-6",
    socialButtonsProviderIcon: "!text-white filter brightness-100 contrast-100 w-6 h-6 scale-125",
    otpCodeFieldInput: "bg-[#1A2333] text-white border-blue-900/50",
    dividerRow: "my-6",
    socialButtonsProviderIcon__github: "!text-white w-6 h-6 scale-125",
    socialButtonsProviderIcon__google: "!text-white w-6 h-6 scale-125",
    card__signIn: "gap-6",
    card__signUp: "gap-6",
    main__signIn: "gap-2",
    main__signUp: "gap-2",
    socialButtonsIconButton__github: "w-6 h-6 scale-125",
    socialButtonsIconButton__google: "w-6 h-6 scale-125",
    socialButtonsBlockButtonContainer: "gap-3"
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    showOptionalFields: false,
    shimmer: true
  },
  variables: {
    colorPrimary: "#3B82F6",
    colorBackground: "#0A1120",
    colorInputBackground: "#1A2333",
    colorInputText: "#FFFFFF",
    colorTextSecondary: "rgba(148, 163, 184, 0.7)",
    borderRadius: "0.5rem",
    spacingUnit: "0.5rem"
  }
} as const

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { isSignedIn } = useUser()

  // Only show navbar on homepage
  const isHomePage = pathname === "/"

  if (!isHomePage) return null

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-sm bg-white/70 dark:bg-slate-900/70 border-b border-blue-100/50 dark:border-blue-900/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Sorami</span>
            <span className="text-xs text-muted-foreground">空見</span>
          </Link>

          <nav className="hidden md:flex gap-6">
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="hidden md:flex items-center gap-2">
            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="mr-2">
                    Dashboard
                  </Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm" className="mr-2">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white border-0 shadow-lg shadow-blue-500/20"
                    size="sm"
                  >
                    Sign Up
                  </Button>
                </SignUpButton>
              </>
            )}
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link
                  href="/features"
                  className="text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="/about"
                  className="text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setOpen(false)}
                >
                  About
                </Link>
                <div className="h-px bg-border my-2" />
                {isSignedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => setOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <div className="mt-2">
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </>
                ) : (
                  <>
                    <SignInButton mode="modal">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setOpen(false)}
                      >
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button
                        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white border-0 shadow-lg shadow-blue-500/20 w-full mt-2"
                        size="sm"
                        onClick={() => setOpen(false)}
                      >
                        Sign Up
                      </Button>
                    </SignUpButton>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

