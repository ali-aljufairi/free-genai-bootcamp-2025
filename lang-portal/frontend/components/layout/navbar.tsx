"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UserButton, useUser } from "@clerk/nextjs"

export default function Navbar() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()

  // Only show navbar on homepage
  const isHomePage = pathname === "/"

  if (!isHomePage) return null

  return (
    <>
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
                  <Link href="/sign-in">
                    <Button variant="outline" size="sm" className="mr-2">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white border-0 shadow-lg shadow-blue-500/20"
                      size="sm"
                    >
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

// Mount our auth dialogs once to avoid re-creating on every click
// (no-op placeholder retained intentionally; dialogs rendered in Navbar)
