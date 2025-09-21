"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowRight, BookOpen, Brain, CheckCircle, GraduationCap, Sparkles, Users } from "lucide-react"

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    {
      title: "Interactive Dashboard",
      description: "Track your progress with detailed insights and visualizations of your learning journey.",
      icon: <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    },
    {
      title: "Vocabulary Browser",
      description: "Explore Japanese words with context, examples, and spaced repetition learning.",
      icon: <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    },
    {
      title: "JLPT Preparation",
      description: "Comprehensive practice materials aligned with official JLPT examination standards.",
      icon: <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    },
    {
      title: "Study Sessions",
      description: "Structured learning sessions adapted to your pace and learning style.",
      icon: <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    },
    {
      title: "Community Features",
      description: "Connect with other learners and share your language learning journey.",
      icon: <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-32 lg:py-40 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 rounded-full bg-blue-300/20 dark:bg-blue-500/10 blur-3xl"
            animate={{
              x: [0, 20, 0],
              y: [0, -20, 0],
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
              <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 rounded-lg font-medium transition-all duration-200 inline-flex items-center">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
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
              <div className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Interactive Learning Dashboard</h3>
                <p className="text-muted-foreground">Experience seamless Japanese language learning with our AI-powered tools</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="container mx-auto px-4 py-16">
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
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="glass-card p-6 rounded-xl border border-blue-100/50 dark:border-blue-900/50 hover:border-blue-200/70 dark:hover:border-blue-800/70 transition-all duration-300"
            >
              <div className="flex items-center mb-4">
                <div className="mr-3">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}