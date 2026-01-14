"use client"

import { useState, useEffect, useRef } from "react"
import { WordBuilderConfig } from "@/components/study/configs/word-builder-config"
import { WordBuilderGame } from "@/components/study/word-builder/word-builder-game"
import { useStartWordBuilder } from "@/hooks/api/use-word-builder"
import { useIsMobile } from "@/hooks/use-mobile"
import { useUserProfile } from "@/hooks/api/useGroup"
import { useWordBuilderStore } from "@/stores/word-builder-store"
import { toast } from "sonner"
import { SubscriptionGate } from "@/components/subscription/subscription-gate"
import { useRouter } from "next/navigation"
import { navigateWithTransition } from "@/lib/view-transitions"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

const defaultPreferences = {
    jlpt_level: 5,
    time_limit: 300,
    show_hints: true,
    auto_validate: true,
    auto_clear_on_success: true,
}

// Check if preferences differ from defaults (user has configured)
function hasConfiguredPreferences(prefs: typeof defaultPreferences): boolean {
    return (
        prefs.jlpt_level !== defaultPreferences.jlpt_level ||
        prefs.time_limit !== defaultPreferences.time_limit ||
        prefs.show_hints !== defaultPreferences.show_hints ||
        prefs.auto_validate !== defaultPreferences.auto_validate ||
        prefs.auto_clear_on_success !== defaultPreferences.auto_clear_on_success
    )
}

export default function WordBuilderPage() {
    const router = useRouter()
    const [showConfig, setShowConfig] = useState(true)
    const [sessionData, setSessionData] = useState<any>(null)
    const isMobile = useIsMobile()
    const { preferences, setPreferences } = useWordBuilderStore()
    const { data: userProfile } = useUserProfile()
    const startMutation = useStartWordBuilder()
    const hasAutoStartedRef = useRef(false)

    const handleBack = async () => {
        await navigateWithTransition(router, "/study", {
            transitionName: 'page',
        })
    }

    // Sync JLPT level from user profile
    useEffect(() => {
        if (userProfile?.settings?.current_jlpt_level &&
            userProfile.settings.current_jlpt_level !== preferences.jlpt_level) {
            setPreferences({
                ...preferences,
                jlpt_level: userProfile.settings.current_jlpt_level
            })
        }
    }, [userProfile?.settings?.current_jlpt_level, preferences, setPreferences])

    const handleStart = async () => {
        try {
            const session = await startMutation.mutateAsync({
                jlpt_level: preferences.jlpt_level,
                time_limit: preferences.time_limit,
            })

            if (!session.valid_words || session.valid_words.length === 0) {
                toast.warning("No valid words found for selected kanji. Please try again.")
            }

            setSessionData(session)
            setShowConfig(false)
        } catch (error) {
            console.error('[WordBuilder] Failed to start game:', error)

            const err = error as { details?: { attempts?: number; max_retries?: number; error?: string; details?: string } }
            const data = err?.details
            const errorMessage = data?.error || (error instanceof Error ? error.message : "Failed to start game")

            if (data?.attempts !== undefined && data?.max_retries !== undefined) {
                toast.error(`Failed after ${data.attempts}/${data.max_retries} attempts: ${errorMessage}`)
            } else {
                toast.error(errorMessage)
            }
        }
    }

    const handleComplete = () => {
        setShowConfig(true)
        setSessionData(null)
        useWordBuilderStore.getState().resetGame()
    }

    // Auto-start if user has configured preferences
    useEffect(() => {
        if (!hasAutoStartedRef.current && hasConfiguredPreferences(preferences) && !startMutation.isPending) {
            hasAutoStartedRef.current = true
            handleStart().catch(() => { })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleShowSettings = () => {
        setShowConfig(true)
        setSessionData(null)
    }

    if (showConfig) {
        return (
            <SubscriptionGate feature="Word Builder">
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
                            <h1 className="text-3xl font-bold tracking-tight">Word Builder</h1>
                            <p className="text-muted-foreground">
                                Build Japanese words by combining kanji characters in this fun timed game!
                            </p>
                        </div>
                    </div>
                    <WordBuilderConfig
                        onStart={handleStart}
                        isLoading={startMutation.isPending}
                        isMobile={isMobile ?? false}
                    />
                </div>
            </SubscriptionGate>
        )
    }

    if (!sessionData) {
        return null
    }

    return (
        <SubscriptionGate feature="Word Builder">
            <div className="h-[calc(100vh-4rem)] overflow-hidden">
                <WordBuilderGame
                    sessionId={sessionData.session_id}
                    kanji={sessionData.kanji || []}
                    validWords={sessionData.valid_words || []}
                    timeLimit={sessionData.time_limit}
                    onComplete={handleComplete}
                    onShowSettings={handleShowSettings}
                />
            </div>
        </SubscriptionGate>
    )
}

