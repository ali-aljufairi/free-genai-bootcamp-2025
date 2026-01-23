"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Crown, Check } from "lucide-react"
import { PricingTable } from "@clerk/nextjs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSubscription } from "@/components/subscription/subscription-gate"
import { useTourContinuation } from "@/hooks/use-tour-continuation"

export default function PricingPage() {
    const [isVisible, setIsVisible] = useState(false)
    const { isLoaded, hasActiveSubscription, plan } = useSubscription()
    // Continue tour if needed
    useTourContinuation()

    useEffect(() => {
        setIsVisible(true)
        // Disable body scrolling
        document.body.style.overflow = 'hidden'
        return () => {
            // Re-enable scrolling when component unmounts
            document.body.style.overflow = 'unset'
        }
    }, [])

    return (
        <main className="flex flex-col gap-12 pb-20 pt-8 overflow-hidden">
            {/* Hero Section */}
            <section id="pricing-hero" className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                        transition={{ duration: 0.5 }}
                        className="mb-4"
                    >
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
                        className="text-xl text-muted-foreground mb-6"
                    >
                        Unlock all AI-powered features and accelerate your Japanese learning journey
                    </motion.p>

                    {/* Active Subscription Badge */}
                    {isLoaded && hasActiveSubscription && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                        >
                            <Crown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium">
                                You're currently on the <span className="font-bold capitalize">{plan}</span> plan
                            </span>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* Pricing Table Section */}
            <section id="pricing-table-section" className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="max-w-6xl mx-auto"
                >

                    <div className="relative">
                        <PricingTable
                            newSubscriptionRedirectUrl="/study"
                            appearance={{
                                variables: {
                                    colorPrimary: '#2563eb',
                                    colorText: '#f8fafc',
                                    colorTextSecondary: '#94a3b8',
                                    colorBackground: 'rgba(30, 41, 59, 0.8)',
                                    colorInputBackground: 'rgba(51, 65, 85, 0.6)',
                                    colorInputText: '#f8fafc',
                                    borderRadius: '0.5rem',
                                },
                                elements: {
                                    card: 'backdrop-blur-md border border-blue-500/50 shadow-xl',
                                    rootBox: 'gap-6',
                                    formButtonPrimary: {
                                        background: '#2563eb !important',
                                        backgroundImage: 'none !important',
                                        backgroundColor: '#2563eb !important',
                                        color: 'white',
                                        borderRadius: '0.5rem',
                                        fontWeight: '500',
                                        border: 'none',
                                        boxShadow: 'none',
                                        '&:hover': {
                                            background: '#1d4ed8 !important',
                                            backgroundImage: 'none !important',
                                            backgroundColor: '#1d4ed8 !important',
                                        },
                                    },
                                    badge: 'bg-blue-600 text-white rounded-md',
                                },
                            }}
                        />
                        {/* Highlight active plan */}
                        {isLoaded && hasActiveSubscription && (
                            <div className="absolute top-4 right-4">
                                <Badge className="bg-blue-300 hover:bg-blue-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Active Plan
                                </Badge>
                            </div>
                        )}
                    </div>
                    <div className="text-center mt-6">
                        <p className="text-sm text-muted-foreground">
                            By subscribing, you agree to our{" "}
                            <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                                Terms of Service
                            </Link>
                            {" "}and{" "}
                            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </div>
                </motion.div>
            </section>

        </main>
    )
}

