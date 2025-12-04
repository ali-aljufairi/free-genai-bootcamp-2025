"use client"

import { Check, Crown, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Feature {
    name: string
    basic: boolean | string
    pro: boolean | string
    highlight?: boolean
}

const features: Feature[] = [
    {
        name: "Core Japanese Learning Tools",
        basic: true,
        pro: true,
    },
    {
        name: "Vocabulary Flashcards",
        basic: true,
        pro: true,
    },
    {
        name: "Kanji Practice",
        basic: true,
        pro: true,
    },
    {
        name: "Grammar Quizzes",
        basic: true,
        pro: true,
    },
    {
        name: "Word Builder Game",
        basic: true,
        pro: true,
    },
    {
        name: "AI Companion Sessions",
        basic: "10 sessions/month",
        pro: "Unlimited",
        highlight: true,
    },
    {
        name: "Feature Request Priority",
        basic: false,
        pro: true,
        highlight: true,
    },
    {
        name: "Advanced Analytics",
        basic: true,
        pro: true,
    },
    {
        name: "Progress Tracking",
        basic: true,
        pro: true,
    },
]

export function PricingComparison() {
    return (
        <Card className="glass-card max-w-5xl mx-auto">
            <CardHeader className="text-center pb-8">
                <div className="inline-flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    <Badge variant="outline" className="text-sm">
                        Compare Plans
                    </Badge>
                </div>
                <CardTitle className="text-3xl md:text-4xl font-bold mb-2">
                    Choose the Right Plan for You
                </CardTitle>
                <CardDescription className="text-base md:text-lg">
                    Pro includes everything in Basic, plus exclusive features
                </CardDescription>
            </CardHeader>

            <CardContent>
                {/* Comparison Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left p-4 font-semibold text-sm md:text-base">
                                    Features
                                </th>
                                <th className="text-center p-4 font-semibold text-sm md:text-base min-w-[120px]">
                                    Basic
                                </th>
                                <th className="text-center p-4 font-semibold text-sm md:text-base min-w-[120px] relative">
                                    <div className="flex items-center justify-center gap-2">
                                        <Crown className="h-4 w-4 text-amber-500" />
                                        <span>Pro</span>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="absolute -top-2 right-2 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400"
                                    >
                                        Best Value
                                    </Badge>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {features.map((feature, index) => (
                                <tr
                                    key={feature.name}
                                    className={cn(
                                        "border-b border-border/50 transition-colors",
                                        feature.highlight && "bg-blue-500/5 dark:bg-blue-500/10",
                                        index % 2 === 0 && "bg-muted/20"
                                    )}
                                >
                                    <td className="p-4 text-sm md:text-base font-medium">
                                        {feature.name}
                                        {feature.highlight && (
                                            <Badge
                                                variant="outline"
                                                className="ml-2 text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400"
                                            >
                                                Pro Exclusive
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {typeof feature.basic === "boolean" ? (
                                            feature.basic ? (
                                                <Check className="h-5 w-5 text-green-500 mx-auto" />
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                {feature.basic}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {typeof feature.pro === "boolean" ? (
                                            feature.pro ? (
                                                <Check className="h-5 w-5 text-green-500 mx-auto" />
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )
                                        ) : (
                                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {feature.pro}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Key Differentiators */}
                <div className="mt-8 pt-8 border-t border-border">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Crown className="h-5 w-5 text-amber-500" />
                                Pro Exclusive Benefits
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>
                                        <strong className="text-foreground">Unlimited AI Companion:</strong> Practice
                                        conversational Japanese without session limits
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>
                                        <strong className="text-foreground">Feature Request Priority:</strong> Get early
                                        access to new features and influence product development
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg">What's Included in Both Plans</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>All core learning tools and study modes</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Progress tracking and analytics</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Regular updates and improvements</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Note about Pro including Basic */}
                <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-center text-muted-foreground">
                        <strong className="text-foreground">Pro includes everything in Basic</strong> — you
                        get all core features plus unlimited AI companion sessions and priority feature
                        requests.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

