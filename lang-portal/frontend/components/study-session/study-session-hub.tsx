"use client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
// import { useCreateStudySession } from "@/hooks/api/useStudySession"
// import { useGroups } from "@/hooks/api/useGroup"
import { toast } from "sonner"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { useSidebar } from "@/hooks/use-sidebar"
import { useAuthSetup } from "@/hooks/use-auth-setup"
import { CARD_IMAGE_DIMENSIONS, studyImages, studyOptions, ENABLED_FEATURES } from "./constants"

export function StudySessionHub() {
  const router = useRouter()
  // const { createSession, isLoading } = useCreateStudySession()
  // const { data: groups } = useGroups()
  const isMobile = useIsMobile()
  const { isExpanded, setIsExpanded } = useSidebar()
  
  // Initialize user setup after authentication (runs in background)
  useAuthSetup()

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

  // Memoize the startSession callback
  const startSession = useCallback(async (type: string, disabled?: boolean) => {
    try {
      // Always minimize sidebar when clicking a card
      setIsExpanded(false)

      if (disabled || !ENABLED_FEATURES.has(type)) {
        toast.error("Feature disabled during database migration")
        return
      }

      // For word and kanji flashcards, route directly without creating backend session
      if (type === "words" || type === "kanji") {
        router.push(`/study/${type}`)
        return
      }

      // TEMPORARILY DISABLED DUE TO DATABASE MIGRATION ISSUES
      // For other features, show disabled message
      toast.error("This feature is temporarily disabled due to database migration")

      // const session = await createSession({
      //   type,
      //   groupId: groups?.[0]?.id,
      //   name: `${type} Session`,
      //   description: `New ${type} study session`,
      // })

      // Special route for companion-study
      // if (type === "companion-study") {
      //   router.push(`/study/companion-study/${session.id}`)
      // } else {
      //   router.push(`/study/${type}/${session.id}`)
      // }
    } catch (error) {
      console.error('Failed to create session:', error)
      toast.error("Failed to start session")
    }
  }, [router, setIsExpanded])

  // Memoize StudyCard component
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
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
        <CardFooter className="z-10 pt-0 pb-4">
          <motion.div
            className="w-full"
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              className="w-full text-sm sm:text-base"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <AnimatePresence>
          {studyOptions.map((option, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05
              }}
            >
              <StudyCard
                title={option.title}
                description={option.description}
                icon={option.icon}
                image={option.image}
                type={option.type}
                disabled={option.disabled}
                reason={option.reason}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}


