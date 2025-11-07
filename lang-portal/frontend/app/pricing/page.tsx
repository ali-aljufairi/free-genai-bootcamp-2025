"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Check, X, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { SignUpButton, useUser } from "@clerk/nextjs"

// Common appearance settings for Clerk modals
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

export default function PricingPage() {
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
    }

    return (
        <main className="flex flex-col gap-16 pb-20 pt-8">
            {/* Hero Section */}
            <section className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                        transition={{ duration: 0.5 }}
                        className="mb-4"
                    >
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 backdrop-blur-sm">
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            Simple, Transparent Pricing
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
                    >
                        Choose Your Plan
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-muted-foreground"
                    >
                        Start learning Japanese for free, or unlock unlimited access to all AI-powered features
                    </motion.p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Free Tier */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <Card className="glass-card h-full border-blue-100/80 dark:border-blue-900/70">
                            <CardHeader>
                                <CardTitle className="text-2xl">Free</CardTitle>
                                <CardDescription className="text-lg mt-2">
                                    Perfect for getting started
                                </CardDescription>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold">$0</span>
                                    <span className="text-muted-foreground">/month</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <ul className="space-y-3">
                                    {freeFeatures.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            {feature.included ? (
                                                <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                            ) : (
                                                <X className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                            )}
                                            <span className={feature.included ? "" : "text-muted-foreground line-through"}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {isSignedIn ? (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleGetStarted}
                                    >
                                        Continue Learning
                                    </Button>
                                ) : (
                                    <SignUpButton mode="modal" appearance={clerkAppearance}>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full"
                                        >
                                            Get Started Free
                                        </Button>
                                    </SignUpButton>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Pro Tier */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <Card className="glass-card h-full border-2 border-blue-500 dark:border-blue-400 relative overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-2xl">Pro</CardTitle>
                                <CardDescription className="text-lg mt-2">
                                    Everything you need for fluency
                                </CardDescription>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold">Coming Soon</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <ul className="space-y-3">
                                    {proFeatures.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    size="lg"
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
                                    disabled
                                >
                                    Coming Soon
                                </Button>
                                <p className="text-sm text-center text-muted-foreground">
                                    Pro features will be available soon. Stay tuned!
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Feature Comparison */}
            <section className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="max-w-4xl mx-auto"
                >
                    <h2 className="text-3xl font-bold text-center mb-8">Feature Comparison</h2>
                    <Card className="glass-card border-blue-100/80 dark:border-blue-900/70">
                        <CardContent className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-4 px-4 font-semibold">Feature</th>
                                            <th className="text-center py-4 px-4 font-semibold">Free</th>
                                            <th className="text-center py-4 px-4 font-semibold">Pro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonFeatures.map((feature, index) => (
                                            <tr key={index} className="border-b last:border-0">
                                                <td className="py-4 px-4">{feature.name}</td>
                                                <td className="py-4 px-4 text-center">
                                                    {feature.free ? (
                                                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
                                                    ) : (
                                                        <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="relative glass-card overflow-hidden rounded-2xl p-8 md:p-16 border border-blue-100/80 dark:border-blue-900/70"
                >

                    <div className="relative z-10 text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold mb-4">Ready to start learning?</h2>
                        <p className="text-lg text-muted-foreground mb-6">
                            Join Sorami today and begin your journey to Japanese fluency
                        </p>
                        {isSignedIn ? (
                            <Button
                                size="lg"
                                className="px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
                                onClick={handleGetStarted}
                            >
                                Continue Learning
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <SignUpButton mode="modal" appearance={clerkAppearance}>
                                <Button
                                    size="lg"
                                    className="px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
                                >
                                    Get Started Free
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </SignUpButton>
                        )}
                    </div>
                </motion.div>
            </section>
        </main>
    )
}

const freeFeatures = [
    { text: "Limited study sessions per month", included: true },
    { text: "Basic flashcards (words & kanji)", included: true },
    { text: "Vocabulary browser", included: true },
    { text: "Progress tracking", included: true },
    { text: "AI Chat Tutor (limited)", included: true },
    { text: "AI Live Speaking", included: false },
    { text: "Speech-to-Image Learning", included: false },
    { text: "AI Agent Study", included: false },
    { text: "Unlimited study sessions", included: false },
    { text: "Advanced analytics", included: false },
    { text: "Priority support", included: false },
]

const proFeatures = [
    "Unlimited study sessions",
    "All AI features (live speaking, chat, agent, speech)",
    "Advanced flashcards with customization",
    "Comprehensive vocabulary browser",
    "Detailed progress analytics",
    "Priority customer support",
    "Early access to new features",
    "Export your progress data",
]

const comparisonFeatures = [
    { name: "Study Sessions", free: true },
    { name: "Word Flashcards", free: true },
    { name: "Kanji Flashcards", free: true },
    { name: "Vocabulary Browser", free: true },
    { name: "Basic Progress Tracking", free: true },
    { name: "AI Chat Tutor (Limited)", free: true },
    { name: "AI Live Speaking", free: false },
    { name: "Speech-to-Image Learning", free: false },
    { name: "AI Agent Study", free: false },
    { name: "Unlimited Sessions", free: false },
    { name: "Advanced Analytics", free: false },
    { name: "Priority Support", free: false },
]

