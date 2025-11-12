"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useWordBuilderStore } from "@/stores/word-builder-store"
import { WordBuilderKanjiPool } from "./word-builder-kanji-pool"
import { WordBuilderSlots } from "./word-builder-slots"
import { WordBuilderKanjiPoolMobile } from "./mobile/word-builder-kanji-pool-mobile"
import { WordBuilderSlotsMobile } from "./mobile/word-builder-slots-mobile"
import { WordBuilderStats } from "./word-builder-stats"
import { WordBuilderResults } from "./word-builder-results"
import { useRefreshKanji, useSubmitWordBuilder } from "@/hooks/api/use-word-builder"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface WordBuilderGameProps {
    sessionId: number
    kanji: any[]
    validWords: any[]
    timeLimit: number
    onComplete: () => void
}

export function WordBuilderGame({
    sessionId,
    kanji,
    validWords,
    timeLimit,
    onComplete,
}: WordBuilderGameProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [showResults, setShowResults] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [timeSpent, setTimeSpent] = useState(0)
    const isMobile = useIsMobile()

    const {
        initSession,
        kanjiPool,
        currentSlots,
        formedWords,
        totalAttempts,
        timeRemaining,
        isPlaying,
        refreshCount,
        preferences,
        validateCurrentWord,
        refreshKanji,
        startTimer,
        updateTimer,
        stopTimer,
        resetGame,
    } = useWordBuilderStore()

    const refreshKanjiMutation = useRefreshKanji()
    const submitMutation = useSubmitWordBuilder()

    // Initialize session
    useEffect(() => {
        initSession(sessionId, kanji, validWords, timeLimit)
    }, [sessionId, kanji, validWords, timeLimit])

    // Note: We use native HTML5 drag-and-drop instead of Swapy
    // because we're dragging from pool to slots (different containers),
    // not swapping items within the same container
    // Swapy is designed for swapping, not for drag-to-drop scenarios

    // Timer logic
    useEffect(() => {
        if (!isPlaying || timeRemaining <= 0) {
            if (timeRemaining <= 0 && isPlaying) {
                handleGameEnd()
            }
            return
        }

        const interval = setInterval(() => {
            const newTime = useWordBuilderStore.getState().timeRemaining - 1
            updateTimer(newTime)

            if (newTime <= 0) {
                handleGameEnd()
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [isPlaying, timeRemaining])

    // Start timer when component mounts
    useEffect(() => {
        if (!startTime) {
            setStartTime(Date.now())
            startTimer()
        }
    }, [])

    // Auto-validate when kanji are placed (if auto-validate is enabled)
    useEffect(() => {
        if (!preferences.auto_validate || !isPlaying) return

        const filledSlots = currentSlots.filter(s => s !== null)
        if (filledSlots.length < 2) return // Need at least 2 kanji for a word

        const kanjiChars = filledSlots.map(k => k!.character).join('')
        const validWords = useWordBuilderStore.getState().validWords

        // Check if current combination matches any valid word of this length
        const matchedWord = validWords.find(w => w.kanji === kanjiChars)

        if (matchedWord) {
            // Found a valid word! Auto-validate immediately
            const timer = setTimeout(() => {
                handleValidate()
            }, 200) // Small delay for smooth UX
            return () => clearTimeout(timer)
        } else if (!currentSlots.includes(null)) {
            // All slots filled but no match - validate to show error
            const timer = setTimeout(() => {
                handleValidate()
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [currentSlots, preferences.auto_validate, isPlaying])

    const handleValidate = () => {
        const result = validateCurrentWord()

        if (result) {
            // Success!
            toast.success(`Valid word: ${result.kanji} (${result.english})`)

            // Check if more words are possible
            checkIfMoreWordsPossible()
        } else {
            // Invalid
            toast.error("Invalid word combination")
        }
    }

    const checkIfMoreWordsPossible = () => {
        // Simple check: if we have less than 2 kanji left, suggest refresh
        const remainingKanji = kanjiPool.filter(k =>
            !currentSlots.some(s => s?.id === k.id)
        )

        if (remainingKanji.length < 2) {
            // Suggest refresh
            toast.info("Not many kanji left. Consider refreshing!")
        }
    }

    const handleRefreshKanji = async () => {
        const storeState = useWordBuilderStore.getState()
        const usedKanjiIds = Array.from(storeState.usedKanjiIds)
        const storeSessionId = storeState.sessionId
        const jlptLevel = storeState.preferences.jlpt_level

        // Use sessionId from props (should match store, but props is source of truth)
        const sessionIdToUse = sessionId || storeSessionId

        try {
            const response = await refreshKanjiMutation.mutateAsync({
                session_id: sessionIdToUse || 0, // Optional - pass 0 if not available
                jlpt_level: jlptLevel,
                used_kanji_ids: usedKanjiIds,
            })

            refreshKanji(response.kanji, response.valid_words)
            toast.success("New kanji loaded!")
        } catch (error: any) {
            console.error("Refresh error details:", {
                error,
                message: error?.message,
                response: error?.response,
                status: error?.response?.status,
                data: error?.response?.data,
            })
            const errorMessage = error?.response?.data?.error || error?.message || "Failed to refresh kanji"
            toast.error(`Refresh failed: ${errorMessage}`)
        }
    }

    const handleGameEnd = async () => {
        stopTimer()

        if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000)
            setTimeSpent(elapsed)
        }

        // Submit results
        const formedWordStrings = formedWords.map(w => w.kanji)

        try {
            await submitMutation.mutateAsync({
                session_id: sessionId,
                formed_words: formedWordStrings,
                total_attempts: totalAttempts,
                time_spent: timeSpent || Math.floor((Date.now() - (startTime || Date.now())) / 1000),
                refresh_count: refreshCount,
            })

            setShowResults(true)
        } catch (error) {
            toast.error("Failed to submit results")
            console.error(error)
            // Still show results even if submission fails
            setShowResults(true)
        }
    }

    const handleRestart = () => {
        resetGame()
        onComplete()
    }

    if (showResults) {
        return (
            <WordBuilderResults
                wordsFormed={formedWords.length}
                totalAttempts={totalAttempts}
                timeSpent={timeSpent || Math.floor((Date.now() - (startTime || Date.now())) / 1000)}
                formedWords={formedWords}
                onRestart={handleRestart}
            />
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden" ref={containerRef}>
            {/* Header */}
            <div className="shrink-0">
                <h2 className="text-2xl font-bold">Word Builder</h2>
            </div>

            {/* Stats */}
            <div className="shrink-0 mt-3">
                <WordBuilderStats
                    wordsFormed={formedWords.length}
                    totalAttempts={totalAttempts}
                    timeRemaining={timeRemaining}
                />
            </div>

            {/* Main Game Area - Vertical Layout with flex */}
            <div className="flex flex-col flex-1 min-h-0 mt-4 space-y-3">
                {/* Top: Word Builder - Takes 60% of space (larger) */}
                <div className="flex-[3] min-h-0 flex flex-col">
                    {isMobile ? (
                        <WordBuilderSlotsMobile slots={currentSlots} onValidate={handleValidate} />
                    ) : (
                        <WordBuilderSlots slots={currentSlots} onValidate={handleValidate} />
                    )}
                </div>

                {/* Bottom: Kanji Pool - Takes 40% of space (smaller) */}
                <div className="flex-[2] min-h-0 flex flex-col space-y-2">
                    <div className="flex items-center justify-between shrink-0">
                        <h3 className="text-sm font-medium text-muted-foreground">Kanji Pool</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefreshKanji}
                            disabled={refreshKanjiMutation.isPending}
                            className="h-8 w-8"
                            title="Refresh Kanji Pool"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshKanjiMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        {isMobile ? (
                            <WordBuilderKanjiPoolMobile kanji={kanjiPool} />
                        ) : (
                            <WordBuilderKanjiPool kanji={kanjiPool} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

