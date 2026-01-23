"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, BookOpen, Brain, CheckCircle, GraduationCap, Sparkles, Users, AlertTriangle, Mic, MessageSquare, Bot, Image as ImageIcon, Zap, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import TourGuide from "@/components/common/tour-guide"

// Common appearance settings for Clerk modals - matching navbar.tsx
const clerkAppearance = {
  elements: {
    rootBox: "",
    card: "bg-gradient-to-r from-blue-600 to-blue-700 shadow-xl border-0",
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    // Add structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Sorami",
      "alternateName": "空見",
      "description": "AI-powered Japanese language learning platform with immersive tools for lasting fluency",
      "url": process.env.NEXT_PUBLIC_APP_URL || "https://sorami.app",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "AI Live Speaking Practice",
        "AI Chat Tutor",
        "Speech-to-Image Learning",
        "Interactive Flashcards",
        "JLPT-Aligned Content",
        "Progress Tracking"
      ]
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <main className="flex flex-col gap-16 pb-20">

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
            className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-blue-300/20 dark:bg-blue-500/10 blur-3xl"
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
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground mb-8"
            >
              <span className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                AI-Powered Learning
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Comprehensive Content
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Track Your Progress
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 items-center justify-center sm:justify-start"
            >
              <TourGuide />
              {isSignedIn ? (
                <Button
                  size="lg"
                  className="px-8 bg-primary text-primary-foreground hover:brightness-95 border-0"
                  onClick={handleGetStarted}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="px-8 bg-primary text-primary-foreground hover:brightness-95 border-0"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
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

      {/* AI Features Showcase Section */}
      <section id="ai-features-section" className="container mx-auto px-4">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold mb-4"
          >
            AI-Powered Learning Features
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Experience the future of language learning with cutting-edge AI technology
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {aiFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <Card className="glass-card h-full border-blue-100/80 dark:border-blue-900/70 overflow-hidden hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-full p-3 w-12 h-12 flex items-center justify-center flex-shrink-0">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground mb-3">{feature.description}</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${feature.checkmarkColor}`} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Choose Sorami Section */}
      <section id="why-choose-section" className="container mx-auto px-4">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold mb-4"
          >
            Why Choose Sorami?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Everything you need for effective and engaging language learning
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {valuePropositions.map((prop, index) => (
            <motion.div
              key={prop.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <Card className="glass-card h-full border-blue-100/80 dark:border-blue-900/70 overflow-hidden">
                <CardContent className="p-6">
                  <div className="rounded-full p-3 w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 mb-4">
                    {prop.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{prop.title}</h3>
                  <p className="text-muted-foreground">{prop.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta-section" className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative glass-card overflow-hidden rounded-2xl p-8 md:p-16 border border-blue-100/80 dark:border-blue-900/70"
        >

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-lg">
              <h2 className="text-3xl font-bold mb-4">Ready to start your language journey?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Start your journey to Japanese fluency with Sorami's immersive, AI-powered learning experience.
              </p>
              <div className="flex flex-wrap gap-4">
                {isSignedIn ? (
                  <Button
                    size="lg"
                    className="px-8 bg-primary text-primary-foreground hover:brightness-95 border-0"
                    onClick={handleGetStarted}
                  >
                    Get Started Free
                  </Button>
                ) : (
                  <Link href="/sign-up">
                    <Button
                      size="lg"
                      className="px-8 bg-primary text-primary-foreground hover:brightness-95 border-0"
                    >
                      Get Started Free
                    </Button>
                  </Link>
                )}
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">Beta Available Now</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Start your Japanese learning journey today with our comprehensive AI-powered platform
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}

const aiFeatures = [
  {
    title: "AI Live Speaking",
    description: "Practice real conversations with our AI-powered speaking companion. Get instant feedback and improve your pronunciation naturally.",
    icon: <Mic className="h-6 w-6 text-blue-500" />,
    checkmarkColor: "text-green-600 dark:text-green-400",
    benefits: [
      "Real-time conversation practice",
      "Instant pronunciation feedback",
      "Natural dialogue flow",
      "Build confidence speaking Japanese"
    ]
  },
  {
    title: "AI Chat Tutor",
    description: "Learn grammar and vocabulary through interactive conversations with your AI Japanese tutor. Get personalized explanations and examples.",
    icon: <MessageSquare className="h-6 w-6 text-purple-500" />,
    checkmarkColor: "text-green-600 dark:text-green-400",
    benefits: [
      "Personalized grammar explanations",
      "Contextual vocabulary learning",
      "Adaptive difficulty levels",
      "24/7 available tutor"
    ]
  },
  {
    title: "Speech-to-Image Learning",
    description: "Describe scenarios in Japanese and watch as AI generates visual representations. Learn through visual association and creative expression.",
    icon: <ImageIcon className="h-6 w-6 text-green-500" />,
    checkmarkColor: "text-green-600 dark:text-green-400",
    benefits: [
      "Visual learning reinforcement",
      "Creative expression practice",
      "Vocabulary in context",
      "Engaging study method"
    ]
  },
  {
    title: "AI Agent Study",
    description: "Interactive learning scenarios powered by AI agents. Practice real-world situations and receive intelligent guidance throughout your journey.",
    icon: <Bot className="h-6 w-6 text-orange-500" />,
    checkmarkColor: "text-green-600 dark:text-green-400",
    benefits: [
      "Real-world scenario practice",
      "Intelligent learning guidance",
      "Contextual learning",
      "Dynamic study sessions"
    ]
  },
]

const valuePropositions = [
  {
    title: "Comprehensive Content Library",
    description: "Access extensive vocabulary, kanji characters, and JLPT-aligned questions to support your learning at every level.",
    icon: <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Multiple Study Modes",
    description: "Choose from flashcards, quizzes, chat sessions, speech practice, drawing exercises, and AI agent interactions.",
    icon: <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Interactive Dashboard",
    description: "Track your progress with detailed insights, visualizations, and analytics of your learning journey.",
    icon: <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Progress Tracking",
    description: "Monitor your learning streak, achievements, and mastery levels to stay motivated and on track.",
    icon: <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Personalized Learning",
    description: "Adaptive learning paths that adjust to your strengths, weaknesses, and learning pace for optimal results.",
    icon: <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
  {
    title: "Immersive Experience",
    description: "Engage with Japanese language learning through beautiful, intuitive design that makes studying enjoyable.",
    icon: <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
  },
]

