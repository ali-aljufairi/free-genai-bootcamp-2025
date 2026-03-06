"use client"

import Sidebar from "@/components/layout/sidebar"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import { usePathname } from "next/navigation"
import { ErrorBoundary } from "@/components/common/error-boundary"
import type React from "react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
import PostHogUserIdentity from "@/components/providers/posthog-user-identity"
// Import the instrumentation client for Sentry
import "../instrumentation-client"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

export default function ClientLayout({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  const pathname = usePathname()
  useEffect(() => {
    if (nonce) {
      // Expose the nonce to client-side scripts that may need it (e.g., Clerk/Next)
      ; (window as unknown as { __cspNonce?: string }).__cspNonce = nonce
    }
  }, [nonce])
  const isHomePage = pathname === "/"
  const isAuthPage = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")
  const isPublicPage = pathname === "/pricing" || pathname === "/terms" || pathname === "/privacy" || pathname === "/business-info"

  if (isHomePage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          enableSystem={false}
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <PostHogUserIdentity />
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    )
  }

  if (isAuthPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          enableSystem={false}
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <PostHogUserIdentity />
          <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    )
  }

  if (isPublicPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          enableSystem={false}
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <PostHogUserIdentity />
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        forcedTheme="dark"
        enableSystem={false}
        defaultTheme="dark"
        disableTransitionOnChange
      >
        <PostHogUserIdentity />
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-4">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
