"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { studyOptions } from "@/components/study-session/constants"
import { setTourContinue } from "@/hooks/use-tour-continuation"
import { useSubscription } from "@/components/subscription/subscription-gate"
import { safeLocalStorageGetItem, safeLocalStorageRemoveItem, safeLocalStorageSetItem } from "@/lib/safe-storage"

// Custom CSS to be injected for driver.js styling to match our site design
const customStyles = `
  /* Override default driver.js styles completely */
  .driver-popover {
    background: rgba(255, 255, 255, 0.9) !important;
    backdrop-filter: blur(8px) !important;
    border: 1px solid rgba(219, 234, 254, 0.7) !important;
    box-shadow: 0 8px 32px rgba(0, 32, 128, 0.1) !important;
  }
  
  /* Hide any duplicate popovers - ensure only one exists */
  body > .driver-popover ~ .driver-popover {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }

  .driver-popover.driver-active {
    animation: fadeIn 0.3s ease-out;
  }

  .driver-popover-title {
    color: #1d4ed8 !important;
    font-weight: 700 !important;
    font-size: 1.25rem !important;
  }

  .driver-popover-description {
    color: #4b5563 !important;
    font-size: 1rem !important;
    line-height: 1.6 !important;
  }

  .driver-popover-footer {
    margin-top: 1rem !important;
  }

  .driver-popover-footer button,
  .driver-popover-footer button:active {
    background: #60a5fa !important;
    background-color: #60a5fa !important;
    background-image: none !important;
    border: none !important;
    color: white !important;
    padding: 0.5rem 1rem !important;
    border-radius: 0.375rem !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
  }

  .driver-popover-footer button:hover {
    background: #3b82f6 !important;
    background-color: #3b82f6 !important;
    background-image: none !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3) !important;
  }

  /* Remove any pseudo-elements that might duplicate text */
  .driver-popover-footer button::before,
  .driver-popover-footer button::after {
    display: none !important;
    content: none !important;
  }

  .driver-popover-next-btn {
    background: #60a5fa !important;
    background-color: #60a5fa !important;
    background-image: none !important;
    color: white !important;
  }

  .driver-popover-next-btn::before,
  .driver-popover-next-btn::after {
    display: none !important;
    content: none !important;
  }

  .driver-popover-next-btn:hover {
    background: #3b82f6 !important;
    background-color: #3b82f6 !important;
    background-image: none !important;
    color: white !important;
  }
  
  /* Ensure button text is white and not duplicated */
  .driver-popover-next-btn,
  .driver-popover-next-btn * {
    color: white !important;
  }

  .driver-popover-footer .driver-popover-prev-btn {
    background: rgba(255, 255, 255, 0.8) !important;
    color: #4b5563 !important;
    border: 1px solid #e5e7eb !important;
  }

  .driver-popover-footer .driver-popover-prev-btn::before,
  .driver-popover-footer .driver-popover-prev-btn::after {
    display: none !important;
    content: none !important;
  }

  .driver-popover-footer .driver-popover-prev-btn:hover {
    background: rgba(255, 255, 255, 1) !important;
    color: #1f2937 !important;
  }
  
  /* Ensure previous button text is not duplicated */
  .driver-popover-prev-btn,
  .driver-popover-prev-btn * {
    color: #4b5563 !important;
  }
  
  .driver-popover-prev-btn:hover,
  .driver-popover-prev-btn:hover * {
    color: #1f2937 !important;
  }

  .driver-popover-progress-text {
    color: #6b7280 !important;
  }

  .driver-popover-navigation-btns {
    gap: 0.5rem;
  }
  
  /* Ensure button text appears only once - remove any pseudo-element text */
  .driver-popover-footer button {
    position: relative;
    text-shadow: none !important;
  }
  
  /* Force single text color for next button - ensure it's visible */
  .driver-popover-next-btn {
    color: white !important;
    display: inline-block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  .driver-popover-next-btn * {
    color: white !important;
  }
  
  /* Remove any text duplication from pseudo-elements */
  .driver-popover-next-btn::before {
    display: none !important;
    content: '' !important;
  }
  
  .driver-popover-next-btn::after {
    display: none !important;
    content: '' !important;
  }
  
  /* Same for previous button - ensure it's visible */
  .driver-popover-prev-btn {
    display: inline-block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  .driver-popover-prev-btn::before {
    display: none !important;
    content: '' !important;
  }
  
  .driver-popover-prev-btn::after {
    display: none !important;
    content: '' !important;
  }

  .driver-popover-close-btn {
    color: #6b7280 !important;
  }

  .driver-popover-close-btn:hover {
    color: #1f2937 !important;
  }

  .driver-highlighted-element {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5) !important;
  }

  .driver-popover-arrow {
    border-color: rgba(219, 234, 254, 0.7) !important;
  }

  @media (prefers-color-scheme: dark) {
    .driver-popover {
      background: rgba(15, 23, 42, 0.85) !important;
      backdrop-filter: blur(8px) !important;
      border: 1px solid rgba(51, 65, 85, 0.5) !important;
    }

    .driver-popover-title {
      color: #60a5fa !important;
    }

    .driver-popover-description,
    .driver-popover-progress-text {
      color: #cbd5e1 !important;
    }

    .driver-popover-footer .driver-popover-prev-btn {
      background: rgba(30, 41, 59, 0.8) !important;
      color: #cbd5e1 !important;
      border: 1px solid #334155 !important;
    }

    .driver-popover-footer .driver-popover-prev-btn:hover {
      background: rgba(30, 41, 59, 1) !important;
      color: #f8fafc !important;
    }

    .driver-popover-close-btn {
      color: #94a3b8 !important;
    }

    .driver-popover-close-btn:hover {
      color: #e2e8f0 !important;
    }
    
    .driver-highlighted-element {
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5) !important;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

// Feature descriptions for tour
const featureDescriptions: Record<string, { title: string; description: string }> = {
  words: {
    title: "Word Flashcards",
    description: "Master Japanese vocabulary with interactive flashcards. Practice words with hiragana, katakana, kanji, and romaji."
  },
  kanji: {
    title: "Kanji Flashcards",
    description: "Learn kanji characters systematically. Study stroke order, meanings, and readings."
  },
  grammar: {
    title: "Grammar Quiz",
    description: "Test your Japanese grammar knowledge with JLPT-aligned quizzes. Get instant feedback."
  },
  chat: {
    title: "Sentence Constructor",
    description: "Build sentences with AI assistance. Practice constructing natural Japanese phrases."
  },
  "word-builder": {
    title: "Word Builder",
    description: "Play a fun timed game building words from kanji. Challenge yourself and improve recognition."
  },
  drawing: {
    title: "Writing Practice",
    description: "Practice writing kanji with stroke guides. Perfect your handwriting and character recognition."
  },
  agent: {
    title: "Learning Resources",
    description: "Get personalized learning plans from AI. Track progress and receive tailored recommendations."
  },
  speech: {
    title: "Speech to Image",
    description: "Describe scenarios in Japanese and see AI-generated images. Visual learning at its best."
  },
  "companion-study": {
    title: "Companion",
    description: "Practice conversations with an AI companion. Improve speaking and listening skills naturally."
  }
}

// Tour state management
const TOUR_STORAGE_KEY = 'sorami-tour-completed'
const TOUR_PROGRESS_KEY = 'sorami-tour-progress'

export function getTourProgress(): number | null {
  if (typeof window === 'undefined') return null
  const progress = safeLocalStorageGetItem(TOUR_PROGRESS_KEY)
  return progress ? parseInt(progress, 10) : null
}

export function setTourProgress(step: number): void {
  if (typeof window === 'undefined') return
  safeLocalStorageSetItem(TOUR_PROGRESS_KEY, step.toString())
}

export function clearTourProgress(): void {
  if (typeof window === 'undefined') return
  safeLocalStorageRemoveItem(TOUR_PROGRESS_KEY)
}

export function isTourCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return safeLocalStorageGetItem(TOUR_STORAGE_KEY) === 'true'
}

export function markTourCompleted(): void {
  if (typeof window === 'undefined') return
  safeLocalStorageSetItem(TOUR_STORAGE_KEY, 'true')
}

// Shared tour state
let globalDriverRef: any = null
let globalStyleElRef: HTMLStyleElement | null = null
let isInitializing = false

interface TourStartOptions {
  hasActiveSubscription?: boolean
}

// Helper to wait for element to appear
function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (element) {
        observer.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

// Initialize tour on a specific page (exported for use by tour continuation hook)
export async function startTourFromPage(pathname: string, router?: any, startTransition?: any, options?: TourStartOptions) {
  if (typeof window === 'undefined') return
  const hasActiveSubscription = Boolean(options?.hasActiveSubscription)
  
  // Reset initialization flag if driver was destroyed (allows tour to continue on new page)
  if (!globalDriverRef && isInitializing) {
    isInitializing = false
  }
  
  // Prevent multiple simultaneous initializations
  if (isInitializing && globalDriverRef) {
    return
  }
  
  isInitializing = true

  try {
    // Remove any existing popover elements first
    const existingPopovers = document.querySelectorAll('.driver-popover')
    existingPopovers.forEach(popover => {
      try {
        popover.remove()
      } catch (e) {
        // Ignore errors
      }
    })
    
    // Remove any existing overlay
    const existingOverlay = document.querySelector('.driver-overlay')
    if (existingOverlay) {
      try {
        existingOverlay.remove()
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Destroy any existing driver instance first to prevent double rendering
    if (globalDriverRef) {
      try {
        globalDriverRef.destroy()
      } catch (e) {
        // Ignore errors during cleanup
      }
      globalDriverRef = null
    }

    // Lazy load driver.js (Rule 2.3 - Defer Non-Critical Third-Party Libraries)
    const { driver } = await import('driver.js')
    // @ts-ignore - CSS import doesn't have type definitions
    await import('driver.js/dist/driver.css')
    
    // Inject custom styles
    if (!globalStyleElRef) {
      const styleEl = document.createElement('style')
      styleEl.innerHTML = customStyles
      document.head.appendChild(styleEl)
      globalStyleElRef = styleEl
    }

    // Wait a bit for page to render
    await new Promise(resolve => setTimeout(resolve, 500))

    let steps: any[] = []

    if (pathname === '/') {
      // Home page steps
      steps = [
        {
          element: "#hero-section",
          popover: {
            title: "Welcome to Sorami",
            description: "Begin your immersive language learning journey with our innovative platform.",
            side: "bottom",
            align: "center",
          }
        },
        {
          element: "#ai-features-section",
          popover: {
            title: "AI-Powered Features",
            description: "Discover all the powerful AI tools we offer to make your language learning efficient and enjoyable.",
            side: "bottom",
            align: "center",
          }
        },
        {
          element: "#why-choose-section",
          popover: {
            title: "Why Choose Sorami?",
            description: "Explore the comprehensive features and benefits that make Sorami the perfect choice for your language learning journey.",
            side: "top",
            align: "center",
          }
        },
        {
          popover: {
            title: "Ready to Explore Features?",
            description: "Let's see all the amazing study tools available to you!",
            onNextClick: () => {
              console.log('[Tour] Navigating to study page')
              if (globalDriverRef) {
                globalDriverRef.destroy()
                globalDriverRef = null
              }
              // Reset initialization flag to allow tour to continue on new page
              isInitializing = false
              // Set flag to continue tour on study page BEFORE navigation
              setTourContinue('/study')
              console.log('[Tour] Set continue flag for /study')
              
              // Navigate immediately - localStorage is synchronous
              if (router && startTransition) {
                startTransition(() => {
                  router.push("/study")
                })
              } else {
                window.location.href = "/study"
              }
              return false
            }
          }
        }
      ]
    } else if (pathname === '/study') {
      // Wait longer for study page to fully render with all cards
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Wait for study hub header to be available
      await waitForElement('#study-hub-header', 5000)
      
      // Wait for at least one study card to be available (indicates cards are loading)
      await waitForElement('[id^="study-card-"]', 5000)
      
      // Study page steps
      const studySteps: any[] = [
        {
          element: "#study-hub-header",
          popover: {
            title: "Study Session Hub",
            description: "Here you'll find all your learning activities. Let's explore each feature!",
            side: "bottom",
            align: "center",
          }
        }
      ]

      // Add steps for each feature card
      for (const option of studyOptions) {
        const featureDesc = featureDescriptions[option.type]
        if (featureDesc) {
          studySteps.push({
            element: `#study-card-${option.type}`,
            popover: {
              title: featureDesc.title,
              description: featureDesc.description,
              side: "top",
              align: "center",
            }
          })
        }
      }

      if (hasActiveSubscription) {
        studySteps.push({
          popover: {
            title: "You're All Set",
            description: "You already have an active plan. Explore any study feature and start learning right away!",
            onNextClick: () => {
              if (globalDriverRef) {
                globalDriverRef.destroy()
                globalDriverRef = null
              }
              markTourCompleted()
              clearTourProgress()
              return false
            }
          }
        })
      } else {
        // Final step to navigate to pricing for non-subscribed users
        studySteps.push({
          popover: {
            title: "Ready to Unlock All Features?",
            description: "Subscribe to access all these amazing learning tools and more!",
            onNextClick: () => {
              console.log('[Tour] Navigating to pricing page')
              if (globalDriverRef) {
                globalDriverRef.destroy()
                globalDriverRef = null
              }
              // Reset initialization flag to allow tour to continue on new page
              isInitializing = false
              // Set flag to continue tour on pricing page BEFORE navigation
              setTourContinue('/pricing')
              console.log('[Tour] Set continue flag for /pricing')
              
              // Navigate immediately - localStorage is synchronous
              if (router && startTransition) {
                startTransition(() => {
                  router.push("/pricing")
                })
              } else {
                window.location.href = "/pricing"
              }
              return false
            }
          }
        })
      }

      steps = studySteps
    } else if (pathname === '/pricing') {
      // Pricing page steps
      steps = hasActiveSubscription
        ? [
            {
              element: "#pricing-hero",
              popover: {
                title: "Subscription Overview",
                description: "Your active plan is detected. You can review options here whenever you want to upgrade or switch.",
                side: "bottom",
                align: "center",
                onNextClick: () => {
                  if (globalDriverRef) {
                    globalDriverRef.destroy()
                    globalDriverRef = null
                  }
                  markTourCompleted()
                  clearTourProgress()
                  return false
                }
              }
            }
          ]
        : [
            {
              element: "#pricing-hero",
              popover: {
                title: "Choose Your Plan",
                description: "Select the perfect plan for your learning journey. All plans include access to our comprehensive learning tools.",
                side: "bottom",
                align: "center",
              }
            },
            {
              element: "#pricing-table-section",
              popover: {
                title: "Subscribe to Unlock Everything",
                description: "Choose Basic for essential features or Pro for unlimited AI companion sessions and priority support. Start your subscription to begin learning!",
                side: "top",
                align: "center",
                onNextClick: () => {
                  if (globalDriverRef) {
                    globalDriverRef.destroy()
                    globalDriverRef = null
                  }
                  markTourCompleted()
                  clearTourProgress()
                  return false
                }
              }
            }
          ]
    }

    // Wait for first element to be available (longer timeout for study page)
    if (steps.length > 0 && steps[0].element) {
      const timeout = pathname === '/study' ? 5000 : 3000
      await waitForElement(steps[0].element, timeout)
    }

    // Initialize driver.js
    const driverInstance = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 10,
      steps,
      onDestroyStarted: () => {
        // Remove any existing popover elements before cleanup
        const cleanupPopovers = () => {
          const existingPopovers = document.querySelectorAll('.driver-popover')
          existingPopovers.forEach(popover => {
            try {
              popover.remove()
            } catch (e) {
              // Ignore errors
            }
          })
          
          // Remove overlay if it exists
          const overlay = document.querySelector('.driver-overlay')
          if (overlay) {
            try {
              overlay.remove()
            } catch (e) {
              // Ignore errors
            }
          }
        }
        
        // Clean up immediately
        cleanupPopovers()
        
        // Also clean up after a short delay to catch any lingering elements
        setTimeout(cleanupPopovers, 100)
        
        // Clean up on destroy
        if (globalStyleElRef && globalStyleElRef.parentNode) {
          globalStyleElRef.parentNode.removeChild(globalStyleElRef)
          globalStyleElRef = null
        }
        isInitializing = false
        globalDriverRef = null
      },
      onDestroyed: () => {
        // Remove any lingering popover elements
        const existingPopovers = document.querySelectorAll('.driver-popover')
        existingPopovers.forEach(popover => {
          try {
            popover.remove()
          } catch (e) {
            // Ignore errors
          }
        })
        
        // Remove overlay if it exists
        const overlay = document.querySelector('.driver-overlay')
        if (overlay) {
          try {
            overlay.remove()
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Ensure cleanup on complete destroy
        isInitializing = false
        globalDriverRef = null
      }
    })

    globalDriverRef = driverInstance
    
    // Clean up any duplicate buttons after a short delay
    const cleanupDuplicates = () => {
      // Remove duplicate next buttons (keep only the first one)
      const nextButtons = document.querySelectorAll('.driver-popover-next-btn')
      if (nextButtons.length > 1) {
        for (let i = 1; i < nextButtons.length; i++) {
          try {
            nextButtons[i].remove()
          } catch (e) {
            // Ignore errors
          }
        }
      }
      
      // Remove duplicate previous buttons (keep only the first one)
      const prevButtons = document.querySelectorAll('.driver-popover-prev-btn')
      if (prevButtons.length > 1) {
        for (let i = 1; i < prevButtons.length; i++) {
          try {
            prevButtons[i].remove()
          } catch (e) {
            // Ignore errors
          }
        }
      }
      
      // Ensure button text is not duplicated
      const allButtons = document.querySelectorAll('.driver-popover-footer button')
      allButtons.forEach(button => {
        // Remove any duplicate text nodes or spans
        const textNodes: Node[] = []
        button.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node)
          }
        })
        // Keep only the first text node, remove others
        if (textNodes.length > 1) {
          for (let i = 1; i < textNodes.length; i++) {
            try {
              const parent = textNodes[i].parentNode
              if (parent) {
                parent.removeChild(textNodes[i])
              }
            } catch (e) {
              // Ignore errors
            }
          }
        }
      })
    }
    
    // Run cleanup after tour starts
    setTimeout(cleanupDuplicates, 100)
    
    // Set up observer to run cleanup when popover is shown
    const observer = new MutationObserver(() => {
      cleanupDuplicates()
    })
    
    // Observe the body for popover additions
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    // Clean up observer after a delay
    setTimeout(() => {
      observer.disconnect()
    }, 5000)
    
    driverInstance.drive()
    isInitializing = false
  } catch (error) {
    console.error('Failed to load tour:', error)
    isInitializing = false
  }
}

export default function TourGuide() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { hasActiveSubscription } = useSubscription()
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  
  // Use refs for stable values (Rule 8.1, 8.2)
  const routerRef = useRef(router)
  
  // Update refs when values change
  routerRef.current = router

  const startTour = async () => {
    if (typeof window === 'undefined') return

    // Clear any previous progress
    clearTourProgress()

    // Start from home page
    const currentPath = window.location.pathname
    if (currentPath !== '/') {
      // Navigate to home first
      startTransition(() => {
        routerRef.current.push('/')
      })
      // Wait for navigation then start tour
      setTimeout(() => {
        startTourFromPage('/', routerRef.current, startTransition, {
          hasActiveSubscription,
        })
      }, 1000)
    } else {
      await startTourFromPage('/', routerRef.current, startTransition, {
        hasActiveSubscription,
      })
    }
  }

  return (
    <Button 
      size="lg" 
      variant="outline" 
      className="px-8" 
      onClick={startTour}
      disabled={isLoading || isPending}
    >
      {isLoading ? "Loading..." : "Take a Tour"}
    </Button>
  )
}
