"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CompanionStudy } from "@/components/study/companion-study"
import { useRouter } from "next/navigation"
import { navigateWithTransition } from "@/lib/view-transitions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown, ArrowLeft } from "lucide-react"
import { useSubscription } from "@/components/subscription/subscription-gate"
import { subscriptionApi } from "@/services/api"
import { useAuth } from "@clerk/nextjs"

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
    const { has } = useAuth()
    const [usageData, setUsageData] = useState<UsageData | null>(null)
    const [loading, setLoading] = useState(true)
    const [hasAccess, setHasAccess] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState(true)
    const { isPro, isBasic } = useSubscription()

    useEffect(() => {
        // Check subscription access - first try Clerk, then backend as fallback
        const checkAccess = async () => {
            const clerkHasBasic = has?.({ plan: 'basic' }) ?? false
            const clerkHasPro = has?.({ plan: 'pro' }) ?? false

            if (clerkHasBasic || clerkHasPro) {
                setHasAccess(true)
                setCheckingAccess(false)
            } else {
                // Check backend subscription service as fallback for Basic plan trials
                try {
                    const data = await subscriptionApi.getUsageCount()
                    const hasBackendAccess = data.plan === 'basic' || data.plan === 'pro'
                    setHasAccess(hasBackendAccess)
                    setUsageData(data)
                } catch (err) {
                    console.error('Failed to check subscription:', err)
                    setHasAccess(false)
                } finally {
                    setCheckingAccess(false)
                    setLoading(false)
                }
                return
            }

            // Fetch usage data
            try {
                const data = await subscriptionApi.getUsageCount()
                setUsageData(data)
            } catch (err) {
                console.error('Failed to fetch usage:', err)
            } finally {
                setLoading(false)
            }
        }

        checkAccess()
    }, [has])

    const handleComplete = useCallback(async () => {
        await navigateWithTransition(router, "/dashboard", {
            transitionName: 'page',
        })
    }, [router])

    const handleBack = useCallback(async () => {
        await navigateWithTransition(router, "/study", {
            transitionName: 'page',
        })
    }, [router])

    // Check if user has reached their limit (Basic plan only)
    const hasReachedLimit = isBasic && usageData && usageData.remaining <= 0

    const usageInline = useMemo(() => {
        if (!usageData || isPro) return null

        const { session_count, limit, remaining } = usageData
        const statusText = remaining <= 0
            ? "Limit reached"
            : `${remaining} left`

        return (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-border/70 bg-background/50 px-2 py-1 font-semibold text-foreground">
                    {session_count}/{limit}
                </span>
                <span className={remaining <= 0 ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                    {statusText}
                </span>
                {remaining > 0 && remaining <= 3 && (
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400"
                    >
                        <Link href="/pricing">Upgrade</Link>
                    </Button>
                )}
            </div>
        )
    }, [usageData, isPro])

    // Show loading state
    if (checkingAccess) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="h-4 w-32 bg-muted rounded" />
                </div>
            </div>
        )
    }

    // Show subscription required if no access
    if (!hasAccess) {
        return (
            <Card className="glass-card max-w-lg mx-auto mt-8 border-amber-200/80 dark:border-amber-800/70 bg-amber-50/30 dark:bg-amber-950/10">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 w-fit">
                        <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle>Subscription Required</CardTitle>
                    <CardDescription>
                        Companion Study is available on Basic and Pro plans. Subscribe now to unlock this feature.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-center">
                        <Button
                            onClick={() => router.push('/pricing')}
                            className="bg-primary text-primary-foreground hover:brightness-95"
                        >
                            <Crown className="mr-2 h-4 w-4" />
                            View Plans & Subscribe
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="h-9 w-9 p-0"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col gap-3 flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Companion Study Session</h1>
                    <p className="text-sm text-muted-foreground">
                        Companion Study is available on Basic and Pro plans. Basic includes a monthly session limit; Pro provides unlimited access.
                    </p>
                </div>
            </div>

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
                <CompanionStudy sessionId={id} onComplete={handleComplete} usageInline={usageInline} />
            )}
        </div>
    )
}
