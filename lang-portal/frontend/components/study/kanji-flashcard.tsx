"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { flashcardsV2Api, groupApi } from "@/services/api"
import type {
    Flashcard,
    FlashcardConfig,
    FlashcardSession,
    FlashcardAnswer,
    FlashcardSubmission,
    FlashcardResult,
    ContentSource,
} from "@/types/api"
import { useKanjiFlashcardStore } from "@/stores/kanji-flashcard-store"
import { useIsMobile } from "@/components/ui/use-mobile"
import { KanjiFlashcardConfig } from "./configs/kanji-flashcard-config"
import { FlashcardSession as FlashcardSessionComponent } from "./shared/flashcard-session"
import { FlashcardResults } from "./shared/flashcard-results"
import { MobileKanjiFlashcard } from "./mobile/mobile-kanji-flashcard"
import { FlashcardSkeleton } from "./shared/flashcard-skeleton"
import { ConfigSkeleton } from "./configs/config-skeleton"
import { AudioPlayer } from "@/components/vocabulary/audio-player"

export function KanjiFlashcard() {
    const isMobile = useIsMobile()

    // State
    const [session, setSession] = useState<FlashcardSession | null>(null)
    const [cards, setCards] = useState<Flashcard[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [showConfig, setShowConfig] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [results, setResults] = useState<FlashcardResult | null>(null)
    const [answers, setAnswers] = useState<FlashcardAnswer[]>([])
    const [score, setScore] = useState(0)
    const [hasAutoStarted, setHasAutoStarted] = useState(false)

    // Timer state
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [isTimerActive, setIsTimerActive] = useState(false)

    // Background submission state
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Zustand store
    const store = useKanjiFlashcardStore()
    const queryClient = useQueryClient()
    const {
        level, selectedGroup, count,
        showCharacter, showOnyomi, showKunyomi, showKanjiEnglish,
        askForCharacter, askForOnyomi, askForKunyomi, askForKanjiEnglish,
        requiredCorrectCount, timerDuration,
        setLevel, setGroup, setCount, setRequiredCorrectCount, setTimerDuration,
        setKanjiShowOptions, setKanjiAskOptions, validateAndFixKanjiOptions
    } = store

    // Auto-start session if preferences exist and haven't auto-started yet
    useEffect(() => {
        const hasValidConfig = askForCharacter || askForOnyomi || askForKunyomi || askForKanjiEnglish

        if (hasValidConfig && !hasAutoStarted && !session && !showResults) {
            setHasAutoStarted(true)
            startSession()
        } else if (!hasValidConfig && !hasAutoStarted) {
            setShowConfig(true)
            setHasAutoStarted(true)
        }
    }, [hasAutoStarted, session, showResults])

    // Validate options on mount and when they change
    useEffect(() => {
        validateAndFixKanjiOptions()
    }, [showCharacter, showOnyomi, showKunyomi, showKanjiEnglish,
        askForCharacter, askForOnyomi, askForKunyomi, askForKanjiEnglish])

    // React Query for groups with caching
    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: groupApi.getGroups,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
    })

    // Timer countdown effect
    useEffect(() => {
        if (!isTimerActive || timeRemaining <= 0) return

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Timer expired - auto-select wrong answer
                    const wrongOptions = cards[currentIndex]?.options
                        .map((_, index) => index)
                        .filter(index => index !== cards[currentIndex]?.correct_index) || []

                    if (wrongOptions.length > 0) {
                        const randomWrongIndex = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
                        handleOptionSelect(randomWrongIndex)
                    }
                    setIsTimerActive(false)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [isTimerActive, timeRemaining, currentIndex, cards])

    // Start timer when new card is shown
    useEffect(() => {
        if (session && cards.length > 0 && timerDuration > 0) {
            setTimeRemaining(timerDuration)
            setIsTimerActive(true)
        }
    }, [currentIndex, session, cards.length, timerDuration])

    // Mutations
    const startSessionMutation = useMutation({
        mutationFn: (config: FlashcardConfig) => flashcardsV2Api.start(config),
        onSuccess: (data) => {
            setSession(data)
            setCards(data.cards)
            setCurrentIndex(0)
            setSelectedOption(null)
            setIsCorrect(null)
            setAnswers([])
            setScore(0)
            setShowConfig(false)
            setShowResults(false)
        },
        onError: (error) => {
            console.error("Failed to start kanji session:", error)
            alert("Failed to start session. Please try again.")
        }
    })

    // Calculate results locally without waiting for backend
    const calculateLocalResults = (finalAnswers: FlashcardAnswer[]): FlashcardResult => {
        const correctCount = finalAnswers.filter(answer => {
            const card = cards.find(c => c.id === answer.card_id)
            return card && answer.answer === card.correct_index
        }).length

        const total = finalAnswers.length
        const percentage = total > 0 ? (correctCount / total) * 100 : 0

        return {
            session_id: session?.id || 0,
            score: correctCount,
            total: total,
            percentage: percentage,
            correct_count: correctCount,
            wrong_count: total - correctCount,
            duration: 0, // We don't track duration locally yet
            results: finalAnswers.map(answer => {
                const card = cards.find(c => c.id === answer.card_id)
                return {
                    card_id: answer.card_id,
                    item_id: card?.item_id || 0,
                    item_type: card?.item_type || '',
                    user_answer: answer.answer,
                    correct_index: card?.correct_index || 0,
                    is_correct: card ? answer.answer === card.correct_index : false
                }
            })
        }
    }

    const submitSessionMutation = useMutation({
        mutationFn: (submission: FlashcardSubmission) => flashcardsV2Api.submit(submission),
        onSuccess: (data) => {
            // Background submission completed - no need to update UI
            setIsSubmitting(false)
            console.log("Background submission completed successfully")

            // Prefetch next session in background
            prefetchNextSession()
        },
        onError: (error) => {
            console.error("Background submission failed:", error)
            setIsSubmitting(false)
            // Don't show alert for background submission failures
        }
    })

    // Prefetch next session function
    const prefetchNextSession = async () => {
        try {
            let contentSource: ContentSource
            let groupId: number | undefined

            if (selectedGroup !== null) {
                contentSource = 'group'
                groupId = selectedGroup
            } else {
                contentSource = 'jlpt'
                groupId = undefined
            }

            const config: FlashcardConfig = {
                flashcard_type: 'kanji',
                content_source: contentSource,
                ...(groupId !== undefined && { group_id: groupId }),
                filters: {
                    jlpt_levels: [level],
                    parts_of_speech: [],
                    difficulty_levels: [],
                    has_kanji: undefined
                },
                kanji_options: {
                    show_character: showCharacter,
                    show_onyomi: showOnyomi,
                    show_kunyomi: showKunyomi,
                    show_english: showKanjiEnglish,
                    ask_for_character: askForCharacter,
                    ask_for_onyomi: askForOnyomi,
                    ask_for_kunyomi: askForKunyomi,
                    ask_for_english: askForKanjiEnglish,
                },
                card_count: count,
                shuffle_options: true,
                required_correct_count: requiredCorrectCount
            }

            // Create cache key based on config
            const cacheKey = ['flashcard-session', JSON.stringify(config)]

            // Prefetch the session
            await queryClient.prefetchQuery({
                queryKey: cacheKey,
                queryFn: () => flashcardsV2Api.start(config),
                staleTime: 2 * 60 * 1000, // 2 minutes
            })
        } catch (error) {
            console.log("Prefetch failed (non-critical):", error)
        }
    }

    const startSession = async () => {
        if (!askForCharacter && !askForOnyomi && !askForKunyomi && !askForKanjiEnglish) {
            alert("Please select at least one option to ask for")
            return
        }

        let contentSource: ContentSource
        let groupId: number | undefined

        if (selectedGroup !== null) {
            contentSource = 'group'
            groupId = selectedGroup
        } else {
            contentSource = 'jlpt'
            groupId = undefined
        }

        const config: FlashcardConfig = {
            flashcard_type: 'kanji',
            content_source: contentSource,
            ...(groupId !== undefined && { group_id: groupId }),
            filters: {
                jlpt_levels: [level],
                parts_of_speech: [],
                difficulty_levels: [],
                has_kanji: undefined
            },
            kanji_options: {
                show_character: showCharacter,
                show_onyomi: showOnyomi,
                show_kunyomi: showKunyomi,
                show_english: showKanjiEnglish,
                ask_for_character: askForCharacter,
                ask_for_onyomi: askForOnyomi,
                ask_for_kunyomi: askForKunyomi,
                ask_for_english: askForKanjiEnglish,
            },
            card_count: count,
            shuffle_options: true,
            required_correct_count: requiredCorrectCount
        }

        // Check for cached session first
        const cacheKey = ['flashcard-session', JSON.stringify(config)]
        const cachedData = queryClient.getQueryData(cacheKey)

        if (cachedData) {
            // Use cached session
            const data = cachedData as FlashcardSession
            setSession(data)
            setCards(data.cards)
            setCurrentIndex(0)
            setSelectedOption(null)
            setIsCorrect(null)
            setAnswers([])
            setScore(0)
            setShowConfig(false)
            setShowResults(false)
            return
        }

        startSessionMutation.mutate(config)
    }

    const handleOptionSelect = (optionIndex: number) => {
        if (selectedOption !== null || !session) return

        // Pause timer when answer is selected
        setIsTimerActive(false)

        setSelectedOption(optionIndex)
        const correct = optionIndex === cards[currentIndex].correct_index
        setIsCorrect(correct)
        if (correct) {
            setScore(prev => prev + 1)
        }

        const answer: FlashcardAnswer = {
            card_id: cards[currentIndex].id,
            answer: optionIndex,
        }
        setAnswers(prev => [...prev, answer])

        setTimeout(() => {
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(prev => prev + 1)
                setSelectedOption(null)
                setIsCorrect(null)
            } else {
                submitSession([...answers, answer])
            }
        }, 1500)
    }

    const submitSession = async (finalAnswers: FlashcardAnswer[]) => {
        if (!session) return

        // Calculate and show results instantly
        const localResults = calculateLocalResults(finalAnswers)
        setResults(localResults)
        setShowResults(true)

        // Submit to backend in background
        setIsSubmitting(true)
        const submission: FlashcardSubmission = {
            session_id: session.id,
            answers: finalAnswers,
        }

        submitSessionMutation.mutate(submission)
    }

    const resetSession = () => {
        setSession(null)
        setCards([])
        setCurrentIndex(0)
        setSelectedOption(null)
        setIsCorrect(null)
        setAnswers([])
        setScore(0)
        setShowConfig(true)
        setShowResults(false)
        setResults(null)
    }

    // Custom rendering for kanji content
    const renderKanjiQuestion = (card: Flashcard) => {
        // Prefer explicit English field; fall back to meanings if provided
        const englishText = card.question.english || card.question.meanings || ""
        // Get text for audio (use character)
        const audioText = card.question.character || ""
        // Get audio_path from card
        const audioPath = card.audio_path || null

        // Determine if we should show audio button next to character
        const showCharacterWithAudio = card.question.character && showCharacter

        return (
            <div className="flex flex-col items-center gap-4">
                {card.question.character && showCharacter && (
                    <div className="flex items-center gap-3">
                        <h2 className={isMobile ? "text-5xl font-bold leading-tight" : "text-8xl font-bold"}>
                            {card.question.character}
                        </h2>
                        {showCharacterWithAudio && audioText && audioPath && (
                            <AudioPlayer
                                audioPath={audioPath}
                                text={audioText}
                                className="shrink-0"
                            />
                        )}
                    </div>
                )}
                {card.question.onyomi && showOnyomi && (
                    <p className={isMobile ? "text-base text-muted-foreground" : "text-4xl text-muted-foreground"}>
                        On: {card.question.onyomi}
                    </p>
                )}
                {card.question.kunyomi && showKunyomi && (
                    <p className={isMobile ? "text-base text-muted-foreground" : "text-4xl text-muted-foreground"}>
                        Kun: {card.question.kunyomi}
                    </p>
                )}
                {englishText && showKanjiEnglish && (
                    <p className={isMobile ? "text-base text-muted-foreground" : "text-4xl text-muted-foreground"}>
                        {englishText}
                    </p>
                )}
            </div>
        )
    }

    const renderKanjiOption = (option: any) => {
        const parts = []
        if (askForKanjiEnglish && (option.english || option.meanings)) {
            parts.push(option.english || option.meanings)
        }
        if (askForCharacter && option.character) parts.push(option.character)
        if (askForOnyomi && option.onyomi) parts.push(option.onyomi)
        if (askForKunyomi && option.kunyomi) parts.push(option.kunyomi)
        return parts.join(' • ') || 'No answer available'
    }

    // Render orchestration
    if (showResults && results) {
        return (
            <FlashcardResults
                results={results}
                onStudyAgain={startSession}
                onNewConfiguration={resetSession}
                isLoading={startSessionMutation.isPending || isSubmitting}
                isMobile={isMobile}
                isSubmitting={isSubmitting}
            />
        )
    }

    // Show config skeleton when loading groups
    if (showConfig && startSessionMutation.isPending) {
        return <ConfigSkeleton isMobile={isMobile} />
    }

    // Only show config if explicitly requested or if we have no valid preferences
    if (showConfig || (!session && !hasAutoStarted && !startSessionMutation.isPending)) {
        return (
            <KanjiFlashcardConfig
                preferences={{
                    level,
                    selectedGroup,
                    count,
                    showCharacter,
                    showOnyomi,
                    showKunyomi,
                    showKanjiEnglish,
                    askForCharacter,
                    askForOnyomi,
                    askForKunyomi,
                    askForKanjiEnglish,
                    requiredCorrectCount,
                    timerDuration
                }}
                groups={Array.isArray(groups) ? groups : []}
                onLevelChange={setLevel}
                onGroupChange={setGroup}
                onCountChange={setCount}
                onShowOptionsChange={setKanjiShowOptions}
                onAskOptionsChange={setKanjiAskOptions}
                onThresholdChange={setRequiredCorrectCount}
                onTimerChange={setTimerDuration}
                onStart={startSession}
                isLoading={startSessionMutation.isPending}
                isMobile={isMobile}
            />
        )
    }

    // Show flashcard skeleton when starting session
    if (startSessionMutation.isPending) {
        return <FlashcardSkeleton isMobile={isMobile} />
    }

    if (!session || cards.length === 0) {
        return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">No kanji available</div>
    }

    // Use separate mobile component for better maintainability
    if (isMobile) {
        return (
            <MobileKanjiFlashcard
                cards={cards}
                currentIndex={currentIndex}
                selectedOption={selectedOption}
                isCorrect={isCorrect}
                score={score}
                timeRemaining={timeRemaining}
                timerDuration={timerDuration}
                onOptionSelect={handleOptionSelect}
                onExit={() => setShowConfig(true)}
                onShowSettings={() => setShowConfig(true)}
                renderQuestion={renderKanjiQuestion}
                renderOption={renderKanjiOption}
            />
        )
    }

    // Desktop layout
    return (
        <FlashcardSessionComponent
            cards={cards}
            currentIndex={currentIndex}
            selectedOption={selectedOption}
            isCorrect={isCorrect}
            score={score}
            timeRemaining={timeRemaining}
            timerDuration={timerDuration}
            onOptionSelect={handleOptionSelect}
            onExit={() => setShowConfig(true)}
            onShowSettings={() => setShowConfig(true)}
            renderQuestion={renderKanjiQuestion}
            renderOption={renderKanjiOption}
            isMobile={false}
        />
    )
}
