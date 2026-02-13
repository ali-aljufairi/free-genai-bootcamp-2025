"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { createSwapy } from "swapy"
import type { Swapy, SwapEvent, SwapStartEvent, SwapEndEvent, BeforeSwapEvent } from "@/types/swapy"
import { useWordBuilderStore } from "@/stores/word-builder-store"
import { WordBuilderKanjiPool } from "./word-builder-kanji-pool"
import { WordBuilderSlots } from "./word-builder-slots"
import { WordBuilderKanjiPoolMobile } from "./mobile/word-builder-kanji-pool-mobile"
import { WordBuilderSlotsMobile } from "./mobile/word-builder-slots-mobile"
import { WordBuilderStats } from "./word-builder-stats"
import { WordBuilderResults } from "./word-builder-results"
import { useRefreshKanji, useSubmitWordBuilder } from "@/hooks/api/use-word-builder"
import { Button } from "@/components/ui/button"
import { RefreshCw, Settings } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface WordBuilderGameProps {
    sessionId: number
    kanji: any[]
    validWords: any[]
    timeLimit: number
    onComplete: () => void
    onShowSettings?: () => void
}

export function WordBuilderGame({
    sessionId,
    kanji,
    validWords,
    timeLimit,
    onComplete,
    onShowSettings,
}: WordBuilderGameProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const swapyInstance = useRef<Swapy | null>(null)
    const prevSlotsHadKanji = useRef(false)
    const hasSubmittedResultsRef = useRef(false)
    const [showResults, setShowResults] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [timeSpent, setTimeSpent] = useState(0)
    const [poolRenderKey, setPoolRenderKey] = useState(0)
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
        placeKanjiInSlot,
        removeKanjiFromSlot,
        swapSlots,
        startTimer,
        updateTimer,
        stopTimer,
        resetGame,
    } = useWordBuilderStore()

    const refreshKanjiMutation = useRefreshKanji()
    const submitMutation = useSubmitWordBuilder()

    const normalizedKanji = Array.isArray(kanji) ? kanji : []
    const normalizedValidWords = Array.isArray(validWords) ? validWords : []
    const effectiveKanjiPool = kanjiPool && kanjiPool.length > 0 ? kanjiPool : normalizedKanji
    const getValidSessionId = () => {
        const storeSessionId = useWordBuilderStore.getState().sessionId
        if (Number.isInteger(sessionId) && sessionId > 0) {
            return sessionId
        }
        if (typeof storeSessionId === "number" && Number.isInteger(storeSessionId) && storeSessionId > 0) {
            return storeSessionId
        }
        return null
    }

    useEffect(() => {
        hasSubmittedResultsRef.current = false
    }, [sessionId])

    useEffect(() => {
        if (normalizedKanji.length === 0) {
            return
        }

        initSession(sessionId, normalizedKanji, normalizedValidWords, timeLimit)
    }, [sessionId, normalizedKanji, normalizedValidWords, timeLimit, initSession])

    // Initialize Swapy for drag-and-drop functionality
    useEffect(() => {
        if (!containerRef.current || effectiveKanjiPool.length === 0) return

        const initializeSwapy = () => {
            if (!containerRef.current) return

            // Verify slots have items before initializing
            const allSlots = containerRef.current.querySelectorAll('[data-swapy-slot]')
            let allSlotsHaveItems = true
            allSlots.forEach((slot) => {
                const items = slot.querySelectorAll('[data-swapy-item]')
                if (items.length === 0) {
                    allSlotsHaveItems = false
                }
            })

            if (!allSlotsHaveItems) {
                // Retry after a short delay
                setTimeout(initializeSwapy, 100)
                return
            }

            // Destroy existing instance if any
            if (swapyInstance.current) {
                swapyInstance.current.destroy()
                swapyInstance.current = null
            }

            // Create Swapy instance with smooth animations
            swapyInstance.current = createSwapy(containerRef.current, {
                animation: 'dynamic',
                swapMode: 'drop',
                dragAxis: 'both',
            })

            // Handle swap logic in onBeforeSwap
            // For pool→slot: update state and return false to prevent Swapy from moving DOM elements
            // This ensures React creates the proper slot element (green with X button)
            swapyInstance.current.onBeforeSwap((event: BeforeSwapEvent) => {
                const { draggingItem, fromSlot, toSlot } = event

                // Prevent dragging placeholders from slots
                if (fromSlot.startsWith('slot-') && draggingItem.startsWith('placeholder-slot-')) {
                    return false
                }

                // Prevent swapping placeholders into pool
                if (toSlot.startsWith('pool-kanji-') && draggingItem.startsWith('placeholder-slot-')) {
                    return false
                }

                // Prevent slot elements from being dragged to pool
                if (draggingItem.startsWith('kanji-slot-') && toSlot.startsWith('pool-kanji-')) {
                    return false
                }

                // CRITICAL: Pool → Slot - handle state update here and prevent Swapy from moving DOM
                // This way React handles rendering the slot element (green with X button)
                // instead of Swapy moving the pool element (blue without X button)
                if (fromSlot.startsWith('pool-kanji-') && toSlot.startsWith('slot-')) {
                    const kanjiId = parseInt(fromSlot.replace('pool-kanji-', ''))
                    const slotIndex = parseInt(toSlot.replace('slot-', ''))
                    const kanji = effectiveKanjiPool.find(k => k.id === kanjiId)
                    if (kanji) {
                        // Update state - React will re-render the slot with proper element
                        placeKanjiInSlot(kanji, slotIndex)
                    }
                    // Return false to prevent Swapy from moving the DOM element
                    return false
                }

                return true
            })

            // Handle swap events for slot→slot moves only (pool→slot is handled in onBeforeSwap)
            swapyInstance.current.onSwap((event: SwapEvent) => {
                const { fromSlot, toSlot, draggingItem, swappedWithItem } = event

                // Slot → Slot (reordering)
                if (fromSlot.startsWith('slot-') && toSlot.startsWith('slot-')) {
                    // Only swap if both are actual kanji (not placeholders)
                    if (!draggingItem.startsWith('placeholder-') && !swappedWithItem.startsWith('placeholder-')) {
                        const fromIndex = parseInt(fromSlot.replace('slot-', ''))
                        const toIndex = parseInt(toSlot.replace('slot-', ''))
                        swapSlots(fromIndex, toIndex)
                    } else {
                        // If one is a placeholder, treat it as placing kanji in empty slot
                        if (draggingItem.startsWith('kanji-slot-')) {
                            const kanjiIdMatch = draggingItem.match(/kanji-slot-(\d+)-\d+/)
                            if (kanjiIdMatch) {
                                const kanjiId = parseInt(kanjiIdMatch[1])
                                const toIndex = parseInt(toSlot.replace('slot-', ''))
                                const storeState = useWordBuilderStore.getState()
                                const kanji = effectiveKanjiPool.find(k => k.id === kanjiId) ||
                                    storeState.currentSlots.find(k => k?.id === kanjiId)
                                if (kanji) {
                                    placeKanjiInSlot(kanji, toIndex)
                                }
                            }
                        }
                    }
                }

                // Update Swapy after state change
                setTimeout(() => {
                    if (swapyInstance.current) {
                        swapyInstance.current.update()
                    }
                }, 0)
            })

            // Handle drag start for visual feedback
            swapyInstance.current.onSwapStart((event: SwapStartEvent) => {
                // Optional: Add visual feedback
            })

            // Handle drag end for cleanup
            swapyInstance.current.onSwapEnd((event: SwapEndEvent) => {
                // Optional: Cleanup or feedback
            })
        }

        // Wait for DOM to be ready with all slots and items
        const timer = setTimeout(() => {
            if (!containerRef.current) return

            // Verify that slots and items exist in DOM before initializing
            const slots = containerRef.current.querySelectorAll('[data-swapy-slot]')
            const items = containerRef.current.querySelectorAll('[data-swapy-item]')

            // Need at least 4 word builder slots + kanji pool slots (4 + 5 = 9 minimum)
            // But we'll check that all slots have items instead
            const allSlotsHaveItems = Array.from(slots).every((slot) => {
                return slot.querySelectorAll('[data-swapy-item]').length > 0
            })

            if (slots.length > 0 && items.length > 0 && allSlotsHaveItems) {
                initializeSwapy()
            } else {
                // Retry after a bit more time
                setTimeout(() => {
                    if (containerRef.current) {
                        const retrySlots = containerRef.current.querySelectorAll('[data-swapy-slot]')
                        const retryItems = containerRef.current.querySelectorAll('[data-swapy-item]')
                        const retryAllHaveItems = Array.from(retrySlots).every((slot) => {
                            return slot.querySelectorAll('[data-swapy-item]').length > 0
                        })
                        if (retrySlots.length > 0 && retryItems.length > 0 && retryAllHaveItems) {
                            initializeSwapy()
                        }
                    }
                }, 200)
            }
        }, 200)

        return () => {
            clearTimeout(timer)
            // Cleanup Swapy instance on unmount
            if (swapyInstance.current) {
                swapyInstance.current.destroy()
                swapyInstance.current = null
            }
        }
    }, [effectiveKanjiPool, placeKanjiInSlot, removeKanjiFromSlot, swapSlots])

    // Update Swapy when slots or kanji pool changes
    useEffect(() => {
        if (swapyInstance.current) {
            const frameId = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (swapyInstance.current) {
                        swapyInstance.current.update()
                    }
                })
            })
            return () => cancelAnimationFrame(frameId)
        }
    }, [currentSlots, effectiveKanjiPool])

    // Force kanji pool re-render when slots are cleared
    // This ensures pool items are visible after Swapy moves elements
    useEffect(() => {
        const allSlotsEmpty = currentSlots.every(slot => slot === null)

        // Check if we just cleared slots (had kanji, now all empty)
        if (allSlotsEmpty && prevSlotsHadKanji.current) {
            // Increment key to force React to completely re-render kanji pool
            // This ensures all kanji are visible in the pool after clearing slots
            setPoolRenderKey(prev => prev + 1)
        }

        // Track if slots had kanji
        prevSlotsHadKanji.current = !allSlotsEmpty
    }, [currentSlots])

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
            // Invalid - clear slots so user can try again
            toast.error("Invalid word combination")
            // Clear slots after a short delay to show the error
            setTimeout(() => {
                const { clearSlots } = useWordBuilderStore.getState()
                clearSlots()
            }, 1000) // 1 second delay to show the error message
        }
    }

    const checkIfMoreWordsPossible = () => {
        // Simple check: if we have less than 2 kanji left, suggest refresh
        const remainingKanji = effectiveKanjiPool.filter(k =>
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
        const jlptLevel = storeState.preferences.jlpt_level

        // Refresh supports missing session id, but prefer a valid id when available.
        const sessionIdToUse = getValidSessionId()

        try {
            const response = await refreshKanjiMutation.mutateAsync({
                session_id: sessionIdToUse || 0, // Optional - pass 0 if not available
                jlpt_level: jlptLevel,
                used_kanji_ids: usedKanjiIds,
            })

            refreshKanji(response.kanji, response.valid_words)
            toast.success("New kanji loaded!")
        } catch (error) {
            console.error("Refresh error:", error)

            const err = error as { details?: { attempts?: number; max_retries?: number; error?: string; details?: string } }
            const data = err?.details
            const errorMessage = data?.error || (error instanceof Error ? error.message : "Failed to refresh kanji")

            if (data?.attempts !== undefined && data?.max_retries !== undefined) {
                toast.error(`Refresh failed after ${data.attempts}/${data.max_retries} attempts: ${errorMessage}`)
            } else {
                toast.error(`Refresh failed: ${errorMessage}`)
            }
        }
    }

    const handleGameEnd = async () => {
        if (hasSubmittedResultsRef.current) {
            return
        }
        hasSubmittedResultsRef.current = true
        stopTimer()

        if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000)
            setTimeSpent(elapsed)
        }

        const sessionIdToSubmit = getValidSessionId()
        // Submit results
        const formedWordStrings = formedWords.map(w => w.kanji)

        if (!sessionIdToSubmit) {
            console.warn("[WordBuilder] Missing valid session_id at submit time, skipping API submit")
            setShowResults(true)
            return
        }

        try {
            await submitMutation.mutateAsync({
                session_id: sessionIdToSubmit,
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
        <div className="flex flex-col h-full overflow-hidden">
            {/* Stats */}
            <div className="shrink-0">
                <WordBuilderStats
                    wordsFormed={formedWords.length}
                    totalAttempts={totalAttempts}
                    timeRemaining={timeRemaining}
                />
            </div>

            {/* Main Game Area - Unified Swapy Container */}
            <div className="flex flex-col flex-1 min-h-0 mt-4 space-y-3">
                {/* Unified Swapy container that includes both slots and pool */}
                <div ref={containerRef} className="flex flex-col flex-1 min-h-0 space-y-3">
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
                            <div className="flex items-center gap-2">
                                {onShowSettings && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onShowSettings}
                                        className="h-8 w-8"
                                        title="Settings"
                                    >
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                )}
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
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden" key={`kanji-pool-${poolRenderKey}`}>
                            {isMobile ? (
                                <WordBuilderKanjiPoolMobile kanji={effectiveKanjiPool} />
                            ) : (
                                <WordBuilderKanjiPool kanji={effectiveKanjiPool} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
