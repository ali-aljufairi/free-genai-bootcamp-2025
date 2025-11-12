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

            setSessionData(session)
            setShowConfig(false)
        } catch (error) {
            toast.error("Failed to start game")
            console.error(error)
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

