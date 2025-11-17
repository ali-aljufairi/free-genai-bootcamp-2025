"use client"

import { useState } from "react"
import { WordBuilderConfig } from "@/components/study/configs/word-builder-config"
import { WordBuilderGame } from "@/components/study/word-builder/word-builder-game"
import { useStartWordBuilder } from "@/hooks/api/use-word-builder"
import { useIsMobile } from "@/hooks/use-mobile"
import { useWordBuilderStore } from "@/stores/word-builder-store"
import { toast } from "sonner"

export default function WordBuilderPage() {
    const [showConfig, setShowConfig] = useState(true)
    const [sessionData, setSessionData] = useState<any>(null)
    const isMobile = useIsMobile()
    const { preferences } = useWordBuilderStore()
    const startMutation = useStartWordBuilder()

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

    if (showConfig) {
        return (
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
        )
    }

    if (!sessionData) {
        return null
    }

    return (
        <div className="h-[calc(100vh-4rem)] overflow-hidden">
            <WordBuilderGame
                sessionId={sessionData.session_id}
                kanji={sessionData.kanji}
                validWords={sessionData.valid_words}
                timeLimit={sessionData.time_limit}
                onComplete={handleComplete}
            />
        </div>
    )
}

