"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

const TOUR_CONTINUE_KEY = 'sorami-tour-continue'

// Helper to wait for specific elements using MutationObserver (event-driven)
function waitForTourElements(pathname: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    // Define target selectors based on pathname
    const selectors: string[] = []
    if (pathname === '/study') {
      selectors.push('#study-hub-header', '[id^="study-card-"]')
    } else if (pathname === '/pricing') {
      selectors.push('#pricing-hero', '#pricing-table-section')
    } else if (pathname === '/') {
      selectors.push('#hero-section')
    }

    if (selectors.length === 0) {
      resolve(false)
      return
    }

    // Check if elements already exist
    const allExist = selectors.every(selector => {
      if (selector.includes('^=')) {
        // Handle attribute starts with selector
        const attrName = selector.split('[')[1].split('^=')[0]
        const attrValue = selector.split('"')[1]
        return Array.from(document.querySelectorAll(`[${attrName}]`)).some(el => 
          el.getAttribute(attrName)?.startsWith(attrValue)
        )
      }
      return document.querySelector(selector) !== null
    })

    if (allExist) {
      console.log('[Tour] All elements already exist')
      resolve(true)
      return
    }

    // Use MutationObserver to watch for elements (event-driven)
    const observer = new MutationObserver(() => {
      const allExist = selectors.every(selector => {
        if (selector.includes('^=')) {
          const attrName = selector.split('[')[1].split('^=')[0]
          const attrValue = selector.split('"')[1]
          return Array.from(document.querySelectorAll(`[${attrName}]`)).some(el => 
            el.getAttribute(attrName)?.startsWith(attrValue)
          )
        }
        return document.querySelector(selector) !== null
      })

      if (allExist) {
        console.log('[Tour] All elements detected via MutationObserver')
        observer.disconnect()
        resolve(true)
      }
    })

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Timeout fallback (but should rarely be needed)
    setTimeout(() => {
      observer.disconnect()
      console.log('[Tour] Timeout waiting for elements, proceeding anyway')
      resolve(true)
    }, 5000)
  })
}

export function useTourContinuation() {
  const pathname = usePathname()
  const hasContinuedRef = useRef<string | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if tour should continue on this page
    const shouldContinue = localStorage.getItem(TOUR_CONTINUE_KEY)
    console.log('[Tour] Hook running - pathname:', pathname, 'shouldContinue:', shouldContinue, 'hasContinued:', hasContinuedRef.current)
    
    // Only proceed if:
    // 1. There's a continue flag set
    // 2. The flag matches the current pathname
    // 3. We haven't already started the tour for this pathname
    if (shouldContinue === pathname && hasContinuedRef.current !== pathname) {
      console.log('[Tour] Continuing tour on:', pathname)
      hasContinuedRef.current = pathname
      
      // Clean up any existing observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      
      // Use event-driven approach: wait for elements to appear
      const startTour = async () => {
        try {
          console.log('[Tour] Waiting for page elements to be ready...')
          
          // Wait for required elements using MutationObserver (event-driven)
          await waitForTourElements(pathname)
          
          // Small additional delay to ensure everything is rendered
          await new Promise(resolve => setTimeout(resolve, 300))
          
          console.log('[Tour] Starting tour continuation for:', pathname)
          
          // Import the tour initialization function
          const { startTourFromPage } = await import('@/components/common/tour-guide')
          
          // Call without router/startTransition - it will use window.location if needed
          await startTourFromPage(pathname)
          
          // Clear the flag only after tour successfully starts
          localStorage.removeItem(TOUR_CONTINUE_KEY)
          console.log('[Tour] Tour started successfully on:', pathname)
        } catch (error) {
          console.error('[Tour] Failed to continue tour:', error)
          // Clear flag on error too to prevent infinite retries
          localStorage.removeItem(TOUR_CONTINUE_KEY)
        }
      }
      
      // Start immediately - waitForTourElements uses MutationObserver internally
      startTour()
    } else if (shouldContinue && shouldContinue !== pathname) {
      // Flag exists but pathname doesn't match - might be stale, clear it
      console.log('[Tour] Clearing stale continue flag:', shouldContinue, 'current path:', pathname)
      localStorage.removeItem(TOUR_CONTINUE_KEY)
    }

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [pathname])
}

export function setTourContinue(pathname: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOUR_CONTINUE_KEY, pathname)
}
