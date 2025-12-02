"use client"

import React, { useEffect, useState } from "react"
import { CompanionStudy } from "@/components/study/companion-study"
import { useRouter } from "next/navigation"
import { navigateWithTransition } from "@/lib/view-transitions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Crown } from "lucide-react"
import { SubscriptionGate, useSubscription } from "@/components/subscription/subscription-gate"

interface PageParams {
    id: string;
}

interface UsageData {
    session_count: number;
    month_year: string;
    plan: string;
    limit: number;
    remaining: number;
}

export default function CompanionStudySessionPage({
    params
}: {
    params: Promise<PageParams>
}) {
    const { id } = React.use(params)
    const router = useRouter()
    const [usageData, setUsageData] = useState<UsageData | null>(null)
    const [loading, setLoading] = useState(true)
    const { isPro, isBasic } = useSubscription()

    useEffect(() => {
        // Fetch usage data
        fetch('/api/langportal/subscription/usage')
            .then(res => res.json())
            .then(data => {
                setUsageData(data)
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to fetch usage:', err)
                setLoading(false)
            })
    }, [])

    const handleComplete = async () => {
        await navigateWithTransition(router, "/dashboard", {
            transitionName: 'page',
        })
    }

    // Check if user has reached their limit (Basic plan only)
    const hasReachedLimit = isBasic && usageData && usageData.remaining <= 0

    const UsageDisplay = () => {
        if (!usageData || isPro) return null

        const { session_count, limit, remaining } = usageData

        if (remaining <= 0) {
            return (
                <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertTitle>Monthly Limit Reached</AlertTitle>
                    <AlertDescription className="mt-2">
                        <p className="mb-3">
                            You've used all {limit} companion study sessions this month. Upgrade to Pro for unlimited access!
                        </p>
                        <Button
                            onClick={() => router.push('/pricing')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        >
                            <Crown className="mr-2 h-4 w-4" />
                            Upgrade to Pro
                        </Button>
                    </AlertDescription>
                </Alert>
            )
        }

        if (remaining <= 3) {
            return (
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle>Limit Warning</AlertTitle>
                    <AlertDescription className="mt-2">
                        <p className="mb-3">
                            You have {remaining} companion study session{remaining !== 1 ? 's' : ''} remaining this month ({session_count}/{limit} used).
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/pricing')}
                        >
                            Upgrade to Pro for Unlimited
                        </Button>
                    </AlertDescription>
                </Alert>
            )
        }

        return (
            <Card className="mb-4">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Usage This Month</CardTitle>
                    <CardDescription>
                        {session_count} of {limit} sessions used
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(session_count / limit) * 100}%` }}
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <SubscriptionGate feature="Companion Study">
            <div className="space-y-5">
                <div className="flex flex-col gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">Companion Study Session</h1>
                </div>

                <UsageDisplay />

                {hasReachedLimit ? (
                    <Card className="glass-card border-amber-200/80 dark:border-amber-800/70">
                        <CardHeader>
                            <CardTitle>Upgrade Required</CardTitle>
                            <CardDescription>
                                You've reached your monthly limit. Upgrade to Pro for unlimited companion study sessions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => router.push('/pricing')}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                                <Crown className="mr-2 h-4 w-4" />
                                Upgrade to Pro
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <CompanionStudy sessionId={id} onComplete={handleComplete} />
                )}
            </div>
        </SubscriptionGate>
    )
}