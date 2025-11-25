"use client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { useSidebar } from "@/hooks/use-sidebar"
import { CARD_IMAGE_DIMENSIONS, studyImages, studyOptions, ENABLED_FEATURES } from "./constants"
import { createSwapy } from 'swapy'
import { useSortedStudyOptions, useStudyCardOrderStore } from '@/stores/study-card-order-store'
import { navigateWithTransition } from '@/lib/view-transitions'
import type { Swapy, SwapEvent, SwapStartEvent, SwapEndEvent } from '@/types/swapy'

/**
 * Study Session Hub Component
 * 
 * Main component for the study session selection interface.
 * Features:
 * - Drag-and-drop card reordering with Swapy library
 * - Smooth view transitions for navigation
 * - Persistent card order across sessions
 * - Responsive design with mobile optimizations
 * 
 * @returns JSX element containing the study session hub
 */
export function StudySessionHub() {
  const router = useRouter()
  // const { createSession, isLoading } = useCreateStudySession()
  // const { data: groups } = useGroups()
  const isMobile = useIsMobile()
  const { isExpanded, setIsExpanded } = useSidebar()

  // Swapy refs and state for drag-and-drop functionality
  const containerRef = useRef<HTMLDivElement>(null)
  const swapyInstance = useRef<Swapy | null>(null)

  // Get sorted study options based on user's preferred order
  // This ensures cards appear in the order the user has arranged them
  const sortedStudyOptions = useSortedStudyOptions()


  // Move prefetching to useEffect to ensure it only runs on client
  useEffect(() => {
    studyOptions.forEach(option => {
      router.prefetch(`/study/${option.type}`)
    })
  }, [router])

  // Preload study images using the window.Image constructor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Object.values(studyImages).forEach((src) => {
        const img = new window.Image();
        img.src = src;
      });
    }
  }, []);

  // Initialize Swapy for drag-and-drop functionality
  useEffect(() => {
    if (containerRef.current && sortedStudyOptions.length > 0) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (containerRef.current) {
          // Create Swapy instance with smooth animations
          swapyInstance.current = createSwapy(containerRef.current, {
            animation: 'dynamic',  // Smooth dynamic animations
            swapMode: 'drop',      // Trigger swap on drop
            dragAxis: 'both',      // Allow dragging in both directions
          });

          // Handle swap events to persist new order
          swapyInstance.current.onSwap((event: SwapEvent) => {
            const newOrder = event.newSlotItemMap.asArray.map((item) => item.item);

            // Convert item IDs back to type names (remove 'item-' prefix)
            const typeOrder = newOrder.map(itemId => itemId.replace('item-', ''));

            // Update the store with new order to persist across sessions
            const { setCardOrder } = useStudyCardOrderStore.getState();
            setCardOrder(typeOrder);
          });

          // Handle drag start for visual feedback
          swapyInstance.current.onSwapStart((event: SwapStartEvent) => {
          });

          // Handle drag end for cleanup and feedback
          swapyInstance.current.onSwapEnd((event: SwapEndEvent) => {
          });
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        // Cleanup Swapy instance on unmount to prevent memory leaks
        if (swapyInstance.current) {
          swapyInstance.current.destroy();
        }
      };
    }
  }, [sortedStudyOptions]); // Re-run when sortedStudyOptions changes

  /**
   * Start a study session with smooth view transitions
   * 
   * @param type - The type of study session to start
   * @param disabled - Whether the session is disabled
   */
  const startSession = useCallback(async (type: string, disabled?: boolean) => {
    try {
      // Always minimize sidebar when clicking a card for better UX
      setIsExpanded(false)

      if (disabled || !ENABLED_FEATURES.has(type)) {
        toast.error("Feature disabled during database migration")
        return
      }

      // For word, kanji, grammar flashcards, and word-builder, route directly with view transition
      if (type === "words" || type === "kanji" || type === "grammar" || type === "word-builder") {
        await navigateWithTransition(router, `/study/${type}`, {
          transitionName: 'page',  // Use page transition for smooth navigation
        })
        return
      }

      // For chat, generate a session ID and route to chat page
      if (type === "chat") {
        // Generate a unique session ID (using timestamp + random for uniqueness)
        const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        await navigateWithTransition(router, `/study/chat/${sessionId}`, {
          transitionName: 'page',
        })
        return
      }

      // For agent (Learning Resources), generate a session ID and route to agent page
      if (type === "agent") {
        // Generate a unique session ID (using timestamp + random for uniqueness)
        const sessionId = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        await navigateWithTransition(router, `/study/agent/${sessionId}`, {
          transitionName: 'page',
        })
        return
      }

      // For drawing (Writing Practice), generate a session ID and route to drawing page
      if (type === "drawing") {
        // Generate a unique session ID (using timestamp + random for uniqueness)
        const sessionId = `drawing-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        await navigateWithTransition(router, `/study/drawing/${sessionId}`, {
          transitionName: 'page',
        })
        return
      }

      // For speech study, generate a session ID and route to speech page
      if (type === "speech") {
        // Generate a unique session ID (using timestamp + random for uniqueness)
        const sessionId = `speech-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        await navigateWithTransition(router, `/study/speech/${sessionId}`, {
          transitionName: 'page',
        })
        return
      }

      // For companion-study, generate a session ID and route to companion page
      if (type === "companion-study") {
        // Generate a unique session ID (using timestamp + random for uniqueness)
        const sessionId = `companion-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        await navigateWithTransition(router, `/study/companion-study/${sessionId}`, {
          transitionName: 'page',
        })
        return
      }

      // TEMPORARILY DISABLED DUE TO DATABASE MIGRATION ISSUES
      // For other features, show disabled message
      toast.error("This feature is temporarily disabled due to database migration")
    } catch (error) {
      console.error('Failed to create session:', error)
      toast.error("Failed to start session")
    }
  }, [router, setIsExpanded])

  /**
   * Memoized StudyCard component for optimal performance
   * 
   * Each card represents a study option with:
   * - Interactive hover and tap animations
   * - Disabled state handling
   * - Responsive design for mobile/desktop
   * - Integration with Swapy for drag-and-drop
   */
  const StudyCard = useMemo(() => ({
    title,
    description,
    icon,
    image,
    type
  }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    image: string;
    type: string;
    disabled?: boolean;
    reason?: string;
  }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}  // Subtle hover effect
      whileTap={{ scale: 0.95 }}    // Tap feedback
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`glass-card relative overflow-hidden flex flex-col h-full ${ENABLED_FEATURES.has(type) ? 'cursor-pointer' : 'opacity-60'}`}
        onClick={() => startSession(type, !ENABLED_FEATURES.has(type))}
      >
        <CardHeader className="z-10 pb-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            {icon}
            {title}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm line-clamp-2">
            {description}
            {!ENABLED_FEATURES.has(type) && (
              <span className="block text-[10px] sm:text-xs text-amber-500 mt-1">Temporarily disabled</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex justify-center items-center py-2 sm:py-4 z-10">
          <motion.div
            className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Image
              src={image}
              alt={`${title} background`}
              width={CARD_IMAGE_DIMENSIONS.large.width}
              height={CARD_IMAGE_DIMENSIONS.large.height}
              className="object-contain"
              sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, 128px"
              priority={true}
              loading="eager"
              placeholder="blur"
              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
            />
            {!ENABLED_FEATURES.has(type) && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xs sm:text-sm font-medium">
                Disabled
              </div>
            )}
          </motion.div>
        </CardContent>
        <CardFooter className="z-10 pt-0 pb-4 px-6">
          <motion.div
            className="w-full"
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              className="w-full text-sm sm:text-base font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              disabled={!ENABLED_FEATURES.has(type)}
            >
              {ENABLED_FEATURES.has(type)
                ? (isMobile ? `Start ${title.split(' ')[0]}` : `Start ${title}`)
                : 'Disabled'}
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  ), [isMobile, startSession]);

  return (
    <motion.div
      className="space-y-4 sm:space-y-8 px-2 sm:px-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 
        Grid container with Swapy integration:
        - ref={containerRef} connects to Swapy instance
        - data-swapy-slot attributes identify draggable slots
        - data-swapy-item attributes identify draggable items
        - Responsive grid layout for different screen sizes
      */}
      <div
        ref={containerRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
      >
        <AnimatePresence>
          {sortedStudyOptions.map((option, index) => (
            <motion.div
              key={option.type}
              data-swapy-slot={`slot-${option.type}`}  // Swapy slot identifier
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05  // Staggered animation for visual appeal
              }}
            >
              <div data-swapy-item={`item-${option.type}`}>  {/* Swapy item identifier */}
                <StudyCard
                  title={option.title}
                  description={option.description}
                  icon={option.icon}
                  image={option.image}
                  type={option.type}
                  disabled={option.disabled}
                  reason={option.reason}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}


