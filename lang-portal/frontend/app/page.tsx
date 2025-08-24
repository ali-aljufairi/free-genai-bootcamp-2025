"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, BookOpen, Brain, CheckCircle, GraduationCap, Sparkles, Users, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatsCards } from "@/components/stats-cards"
import { useRouter } from "next/navigation"
import { SignUpButton, useUser } from "@clerk/nextjs"
import TourGuide from "@/components/tour-guide"

// Common appearance settings for Clerk modals - matching navbar.tsx
const clerkAppearance = {
  elements: {
    rootBox: "",
    card: "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl border-0",
    modalBackdrop: "backdrop-blur-md",
    modalContent: "bg-transparent",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-white/80",
    formFieldLabel: "text-white/90",
    formFieldInput: "bg-white/20 text-white border-white/30 placeholder:text-white/60",
    formButtonPrimary: "bg-white hover:bg-white/90 text-blue-600 font-medium",
    formButtonReset: "text-white hover:text-white/90",
    footerActionLink: "text-white hover:text-white/90 font-medium",
    footerActionText: "text-white/80",
    identityPreview: "bg-white/20 border-white/30",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-white/80 hover:text-white",
    formFieldLabelRow: "text-white/90"
  }
}

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const { isSignedIn } = useUser()

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.push("/study")
    }
    // If not signed in, the SignUpButton component will handle it
  }

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Database Migration Warning Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Database Migration in Progress
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Some features are temporarily disabled. Only Word Flashcards and Kanji Cards are available.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section id="hero-section" className="relative min-h-[90vh] flex items-center py-20 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 -z-10">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 rounded-full bg-blue-200/20 dark:bg-blue-500/10 blur-3xl"
            animate={{
              x: [0, 10, 0],
              y: [0, 15, 0],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 8,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-indigo-300/20 dark:bg-indigo-500/10 blur-3xl"
            animate={{
              x: [0, -20, 0],
              y: [0, 10, 0],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 10,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5 }}
              className="mb-4"
            >
              <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Immersive Language Learning
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
            >
              <span className="text-blue-600 dark:text-blue-400">Sorami</span>{" "}
              <span className="text-sm md:text-base align-top text-muted-foreground">空見</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl"
            >
              Elevate your language learning journey with an immersive, intuitive experience designed for lasting
              fluency.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {isSignedIn ? (
                <Button
                  size="lg"
                  className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                  onClick={handleGetStarted}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <SignUpButton mode="modal" appearance={clerkAppearance}>
                  <Button
                    size="lg"
                    className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignUpButton>
              )}
              <TourGuide />
            </motion.div>
          </div>

          {/* Feature Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 40 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-16 relative"
          >
            <div className="glass-card overflow-hidden rounded-xl border border-blue-100/80 dark:border-blue-900/70 shadow-xl">
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="container mx-auto px-4">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold mb-4"
          >
            Core Features
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Everything you need for effective language learning
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <Card className="glass-card h-full border-blue-100/80 dark:border-blue-900/70 overflow-hidden">
                <CardContent className="p-6">
                  <div className="rounded-full p-3 w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats-section" className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <StatsCards />
        </motion.div>
      </section>

      {/* CTA Section */}
      <section id="cta-section" className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl p-8 md:p-16"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/90 to-indigo-100/90 dark:from-blue-900/90 dark:to-indigo-900/90 backdrop-blur-sm"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-lg">
              <h2 className="text-3xl font-bold mb-4">Ready to start your language journey?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Join thousands of learners who have achieved fluency with Sorami's immersive approach.
              </p>
              <div className="flex flex-wrap gap-4">
                {isSignedIn ? (
                  <Button
                    size="lg"
                    className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                    onClick={handleGetStarted}
                  >
                    Get Started Free
                  </Button>
                ) : (
                  <SignUpButton mode="modal" appearance={clerkAppearance}>
                    <Button
                      size="lg"
                      className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                    >
                      Get Started Free
                    </Button>
                  </SignUpButton>
                )}
                <Button size="lg" variant="outline" className="px-8">
                  View Pricing
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 border-2 border-white dark:border-slate-900"
                  ></div>
                ))}
              </div>
              <div>
                <div className="font-bold">Join 10,000+ users</div>
                <div className="text-sm text-muted-foreground">Learning with Sorami</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

const features = [
  {
    title: "Interactive Dashboard",
    description: "Track your progress with detailed insights and visualizations of your learning journey.",
    icon: <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Vocabulary Browser",
    description: "Explore and learn new words with our interactive card-based vocabulary system.",
    icon: <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Study Sessions",
    description: "Engage in focused learning activities designed to maximize retention and fluency.",
    icon: <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Progress Tracking",
    description: "Monitor your learning streak and achievements to stay motivated.",
    icon: <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Personalized Learning",
    description: "Adaptive learning paths that adjust to your strengths and areas for improvement.",
    icon: <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Community Support",
    description: "Connect with fellow learners to practice and share your language journey.",
    icon: <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
]

