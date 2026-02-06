"use client"

import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown, Lock } from "lucide-react"

interface SubscriptionGateProps {
  children: React.ReactNode
  /** Feature name for display purposes */
  feature?: string
  /** If true, shows loading state while checking subscription */
  showLoading?: boolean
  /** Custom fallback component */
  fallback?: React.ReactNode
}

type NormalizedPlan = "basic" | "pro" | "free" | null

function normalizeSubscriptionPlan(rawPlan: unknown): NormalizedPlan {
  if (typeof rawPlan !== "string") {
    return null
  }

  const normalized = rawPlan.toLowerCase()
  if (normalized === "pro" || normalized === "basic" || normalized === "free") {
    return normalized
  }

  return null
}

function resolveSubscriptionState(has: ReturnType<typeof useAuth>["has"], metadataPlan: NormalizedPlan) {
  const hasBasicPlan = Boolean(has?.({ plan: "basic" }) || metadataPlan === "basic")
  const hasProPlan = Boolean(has?.({ plan: "pro" }) || metadataPlan === "pro")
  const hasFreePlan = Boolean(has?.({ plan: "free" }) || metadataPlan === "free")
  const hasActiveSubscription = hasBasicPlan || hasProPlan
  const plan: NormalizedPlan = hasProPlan ? "pro" : hasBasicPlan ? "basic" : hasFreePlan ? "free" : null

  return {
    hasActiveSubscription,
    isPro: hasProPlan,
    isBasic: hasBasicPlan,
    isFree: hasFreePlan,
    plan,
  }
}

/**
 * SubscriptionGate - Protects content behind subscription requirement
 * 
 * Uses Clerk's has() method to check if user has an active subscription plan.
 * This works with Clerk Billing - plans are configured in Clerk Dashboard.
 */
export function SubscriptionGate({
  children,
  feature = "this feature",
  showLoading = true,
  fallback
}: SubscriptionGateProps) {
  const { has, isLoaded: authLoaded } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const router = useRouter()

  const isLoaded = authLoaded && userLoaded
  const metadataPlan = normalizeSubscriptionPlan(user?.publicMetadata?.["subscription_plan"])
  const { hasActiveSubscription } = resolveSubscriptionState(has, metadataPlan)

  // Show loading state
  if (!isLoaded && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    )
  }

  // User not signed in
  if (isLoaded && !user) {
    return (
      <Card className="glass-card max-w-lg mx-auto mt-8 border-blue-100/80 dark:border-blue-900/70">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 w-fit">
            <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Sign In Required</CardTitle>
          <CardDescription>
            Please sign in to access {feature}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            onClick={() => router.push('/sign-in')}
            className="bg-primary text-primary-foreground hover:brightness-95"
          >
            Sign In
          </Button>
        </CardContent>
      </Card>
    )
  }

  // User has no subscription
  if (isLoaded && user && !hasActiveSubscription) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Card className="glass-card max-w-lg mx-auto mt-8 border-amber-200/80 dark:border-amber-800/70 bg-amber-50/30 dark:bg-amber-950/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 w-fit">
            <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle>Subscription Required</CardTitle>
          <CardDescription>
            You need an active subscription to access {feature}. Subscribe now to unlock all learning features.
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
          <p className="text-xs text-center text-muted-foreground">
            Plans start at $10/month. Cancel anytime.
          </p>
        </CardContent>
      </Card>
    )
  }

  // User has active subscription - show content
  return <>{children}</>
}

/**
 * useSubscription - Hook to check subscription status using Clerk's has() method
 */
export function useSubscription() {
  const { has, isLoaded: authLoaded } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()

  const isLoaded = authLoaded && userLoaded
  const metadataPlan = normalizeSubscriptionPlan(user?.publicMetadata?.["subscription_plan"])
  const subscriptionState = resolveSubscriptionState(has, metadataPlan)

  return {
    isLoaded,
    ...subscriptionState,
  }
}
