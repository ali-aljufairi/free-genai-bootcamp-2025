"use client"

import { useState, useEffect, useRef } from "react"
import { WordBuilderConfig } from "@/components/study/configs/word-builder-config"
import { WordBuilderGame } from "@/components/study/word-builder/word-builder-game"
import { useStartWordBuilder } from "@/hooks/api/use-word-builder"
import { useIsMobile } from "@/hooks/use-mobile"
import { useWordBuilderStore } from "@/stores/word-builder-store"
import { toast } from "sonner"
import { SubscriptionGate } from "@/components/subscription/subscription-gate"

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
    const [showConfig, setShowConfig] = useState(true)
    const [sessionData, setSessionData] = useState<any>(null)
    const isMobile = useIsMobile()
    const { preferences } = useWordBuilderStore()
    const startMutation = useStartWordBuilder()
    const hasAutoStartedRef = useRef(false)

    const handleStart = async () => {
        try {
            const session = await startMutation.mutateAsync({
                jlpt_level: preferences.jlpt_level,
                time_limit: preferences.time_limit,
            })

            // Log session data for debugging
            console.log('[WordBuilder] Session started:', {
                session_id: session.session_id,
                kanji_count: session.kanji?.length || 0,
                valid_words_count: session.valid_words?.length || 0,
                time_limit: session.time_limit,
            })

            // Warn if no valid words (shouldn't happen after backend fix)
            if (!session.valid_words || session.valid_words.length === 0) {
                console.warn('[WordBuilder] WARNING: No valid words returned from API!', {
                    kanji_ids: session.kanji?.map(k => k.id) || [],
                    kanji_chars: session.kanji?.map(k => k.character) || [],
                })
                toast.warning("No valid words found for selected kanji. Please try again.")
            }

            setSessionData(session)
            setShowConfig(false)
        } catch (error) {
            console.error('[WordBuilder] Failed to start game:', error)
            toast.error("Failed to start game")
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
            handleStart()
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
                    <div className="flex flex-col gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">Word Builder</h1>
                        <p className="text-muted-foreground">
                            Build Japanese words by combining kanji characters in this fun timed game!
                        </p>
                    </div>
                    <WordBuilderConfig
                        onStart={handleStart}
                        isLoading={startMutation.isPending}
                        isMobile={isMobile}
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
                    kanji={sessionData.kanji}
                    validWords={sessionData.valid_words}
                    timeLimit={sessionData.time_limit}
                    onComplete={handleComplete}
                    onShowSettings={handleShowSettings}
                />
            </div>
        </SubscriptionGate>
    )
}

