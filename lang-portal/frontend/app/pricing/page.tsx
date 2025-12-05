"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { PricingComparison } from "@/components/pricing/pricing-comparison"

export default function PricingPage() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    return (
        <main className="flex flex-col gap-12 pb-20 pt-8">
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
                        Unlock all AI-powered features and accelerate your Japanese learning journey
                    </motion.p>
                </div>
            </section>

            {/* Custom Pricing Comparison Table */}
            <section className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <PricingComparison />
                </motion.div>
            </section>

            {/* Clerk Pricing Table - temporarily hidden until Stripe verification is complete */}
            {/* 
            <section className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="text-center mb-6">
                        <h2 className="text-2xl md:text-3xl font-bold mb-2">
                            Ready to Get Started?
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Select your plan below and start your Japanese learning journey today
                        </p>
                        <p className="text-sm text-muted-foreground">
                            💡 Toggle "Billed annually" to save up to 20%
                        </p>
                    </div>

                    <PricingTable
                        appearance={{
                            variables: {
                                // Sorami primary color (matches bg-primary)
                                colorPrimary: '#2563eb', // blue-600
                                colorText: '#f8fafc',
                                colorTextSecondary: '#94a3b8',
                                colorBackground: 'rgba(30, 41, 59, 0.8)',
                                colorInputBackground: 'rgba(51, 65, 85, 0.6)',
                                colorInputText: '#f8fafc',
                                borderRadius: '0.5rem',
                            },
                            elements: {
                                // Card styling with border
                                card: 'backdrop-blur-md border border-blue-500/50 shadow-xl',
                                rootBox: 'gap-6',
                                // Button styling - solid blue, no gradient, matches "Get Started" button
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
                </motion.div>
            </section>
            */}
        </main>
    )
}
