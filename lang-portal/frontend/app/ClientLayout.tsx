"use client"

import Sidebar from "@/components/sidebar"
import Navbar from "@/components/navbar"
import { usePathname } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
// Import the PostHog instrumentation client
import "../instrumentation-client"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Provide a resilient default query function so queries without an explicit queryFn still work
      // Supports both simple queries: ['endpoint'] and with params: ['endpoint', { page: 1, pageSize: 20 }]
      // Also supports infinite queries by honoring pageParam when present
      queryFn: async ({ queryKey, pageParam, signal }: any) => {
        const [endpointOrUrl, paramsFromKey] = queryKey as [string, Record<string, any> | undefined]

        // Build base URL - allow absolute/relative URLs, otherwise prefix our API base
        let url = endpointOrUrl
        if (typeof url === 'string' && !url.startsWith('/') && !url.startsWith('http')) {
          url = `/api/langportal/${url}`
        }

        // Merge params from key and pageParam (for infinite queries)
        const params: Record<string, any> = { ...(paramsFromKey || {}) }
        if (pageParam !== undefined) {
          params.page = pageParam
        }

        const qs = new URLSearchParams(
          Object.entries(params).reduce((acc, [k, v]) => {
            if (v !== undefined && v !== null) acc[k] = String(v)
            return acc
          }, {} as Record<string, string>)
        ).toString()

        const fullUrl = qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url

        const res = await fetch(fullUrl, { signal })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`Request failed ${res.status}: ${text || fullUrl}`)
        }
        return res.json()
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  if (isHomePage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
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
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 p-4 md:p-6 lg:p-8">
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

