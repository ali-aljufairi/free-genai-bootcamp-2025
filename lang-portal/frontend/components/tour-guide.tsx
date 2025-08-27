"use client"

import { useEffect, useState } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { useRouter } from "next/navigation"
import { SignUpButton, useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

// Updated appearance settings to match the sign-up page
const clerkAppearance = {
    elements: {
        formButtonPrimary:
            "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white",
        card: "bg-transparent shadow-none",
        headerTitle: "hidden",
        headerSubtitle: "hidden",
        footerAction: "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
        rootBox: "",
        modalBackdrop: "backdrop-blur-md",
        modalContent: "bg-white/70 dark:bg-slate-900/70 p-6 shadow-lg border border-blue-100/50 dark:border-blue-900/50 backdrop-blur-sm rounded-md"
    }
}

// Custom CSS to be injected for driver.js styling to match our site design
const customStyles = `
  .driver-popover {
    background: rgba(255, 255, 255, 0.9) !important;
    backdrop-filter: blur(8px) !important;
    border: 1px solid rgba(219, 234, 254, 0.7) !important;
    box-shadow: 0 8px 32px rgba(0, 32, 128, 0.1) !important;
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
    background: linear-gradient(to right, #2563eb, #4f46e5) !important;
    border: none !important;
    color: white !important;
    padding: 0.5rem 1rem !important;
    border-radius: 0.375rem !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
  }

  .driver-popover-footer button:hover {
    background: linear-gradient(to right, #1e40af, #4338ca) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 128, 0.2) !important;
  }

  .driver-popover-footer .driver-popover-prev-btn {
    background: rgba(255, 255, 255, 0.8) !important;
    color: #4b5563 !important;
    border: 1px solid #e5e7eb !important;
  }

  .driver-popover-footer .driver-popover-prev-btn:hover {
    background: rgba(255, 255, 255, 1) !important;
    color: #1f2937 !important;
  }

  .driver-popover-progress-text {
    color: #6b7280 !important;
  }

  .driver-popover-navigation-btns {
    gap: 0.5rem;
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
`;

export default function TourGuide() {
    const [driverObj, setDriverObj] = useState<any>(null)
    const router = useRouter()
    const { isSignedIn } = useUser()

    // Initialize driver.js when component mounts
    useEffect(() => {
        // First, inject our custom styles
        const styleEl = document.createElement('style')
        styleEl.innerHTML = customStyles
        document.head.appendChild(styleEl)

        // Initialize driver.js with our custom styles already applied
        const driverInstance = driver({
            showProgress: true,
            animate: true,
            smoothScroll: true,
            stagePadding: 10,
            steps: [
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
                    element: "#features-section",
                    popover: {
                        title: "Core Features",
                        description: "Discover all the powerful tools we offer to make your language learning efficient and enjoyable.",
                        side: "bottom",
                        align: "center",
                    }
                },
                {
                    element: "#stats-section",
                    popover: {
                        title: "Track Your Progress",
                        description: "View detailed statistics on your learning journey with our analytics dashboard.",
                        side: "top",
                        align: "center",
                    }
                },
                {
                    element: "#cta-section",
                    popover: {
                        title: "Join Our Community",
                        description: "Sign up now to begin your personalized language learning experience with thousands of other learners.",
                        side: "top",
                        align: "center",
                    }
                },
                {
                    popover: {
                        title: "Ready to Start Learning?",
                        description: "Sign up now to unlock all features and begin your language journey!",
                        onNextClick: () => {
                            if (!isSignedIn) {
                                // We'll show the signup modal after closing the tour
                                driverInstance.destroy()
                                // Small timeout to ensure driver has cleaned up
                                setTimeout(() => {
                                    const signupButton = document.getElementById("tour-signup-button")
                                    signupButton?.click()
                                }, 300)
                                return false // Prevents driver from moving to next step
                            } else {
                                router.push("/study")
                                return false // We'll handle navigation ourselves
                            }
                        }
                    }
                }
            ],
        })

        setDriverObj(driverInstance)

        return () => {
            if (driverInstance) {
                driverInstance.destroy()
            }
            // Clean up our custom styles
            if (styleEl.parentNode) {
                styleEl.parentNode.removeChild(styleEl)
            }
        }
    }, [isSignedIn, router])

    const startTour = () => {
        if (driverObj) {
            driverObj.drive()
        }
    }

    return (
        <>
            <Button size="lg" variant="outline" className="px-8" onClick={startTour}>
                Take a Tour
            </Button>
            {!isSignedIn && (
                <div className="hidden">
                    <SignUpButton mode="modal" fallbackRedirectUrl="/study" appearance={clerkAppearance}>
                        <Button id="tour-signup-button">Sign Up</Button>
                    </SignUpButton>
                </div>
            )}
        </>
    )
}