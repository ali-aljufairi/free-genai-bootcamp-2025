"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { flashcardsV2Api } from "@/services/api"
import type {
    Flashcard,
    FlashcardConfig,
    FlashcardSession,
    FlashcardAnswer,
    FlashcardSubmission,
    FlashcardResult,
    ContentSource,
    Course,
    Unit
} from "@/types/api"
import { useFlashcardStore } from "@/stores/flashcard-store"
import { useIsMobile } from "@/components/ui/use-mobile"
import { WordFlashcardConfig } from "./configs/word-flashcard-config"
import { FlashcardSession as FlashcardSessionComponent } from "./shared/flashcard-session"
import { FlashcardResults } from "./shared/flashcard-results"
import { MobileWordsFlashcard } from "./mobile/mobile-words-flashcard"

export function WordsFlashcard() {
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

    // Zustand store
    const store = useFlashcardStore()
    const {
        level, selectedCourse, selectedUnit, count, selectedPartsOfSpeech,
        showKana, showKanji, showRomaji, showEnglish,
        askForKana, askForKanji, askForRomaji, askForEnglish,
        requiredCorrectCount,
        setLevel, setCourse, setUnit, setCount, setPartsOfSpeech, setRequiredCorrectCount,
        setShowOptions, setAskOptions, validateAndFixOptions
    } = store

    // Auto-start session if preferences exist and haven't auto-started yet
    useEffect(() => {
        const hasValidConfig = askForKana || askForKanji || askForRomaji || askForEnglish

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
        validateAndFixOptions()
    }, [showKana, showKanji, showRomaji, showEnglish,
        askForKana, askForKanji, askForRomaji, askForEnglish])

    // React Query for courses and units
    const { data: allCourses = [] } = useQuery({
        queryKey: ['courses'],
        queryFn: flashcardsV2Api.courses
    })

    const availableCourses = Array.isArray(allCourses)
        ? allCourses.filter(course => course.level === level)
        : []

    const { data: units = [] } = useQuery({
        queryKey: ['units', selectedCourse],
        queryFn: () => flashcardsV2Api.units(selectedCourse!),
        enabled: selectedCourse !== null
    })

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
            console.error("Failed to start words session:", error)
            alert("Failed to start session. Please try again.")
        }
    })

    const submitSessionMutation = useMutation({
        mutationFn: (submission: FlashcardSubmission) => flashcardsV2Api.submit(submission),
        onSuccess: (data) => {
            setResults(data)
            setShowResults(true)
        },
        onError: (error) => {
            console.error("Failed to submit session:", error)
            alert("Failed to submit session. Results may not be saved.")
        }
    })

    const startSession = async () => {
        if (!askForKana && !askForKanji && !askForRomaji && !askForEnglish) {
            alert("Please select at least one option to ask for")
            return
        }

        let contentSource: ContentSource
        let courseId: number | undefined
        let unitId: number | undefined

        if (selectedCourse !== null) {
            contentSource = 'unit'
            courseId = selectedCourse
            unitId = selectedUnit || undefined
        } else {
            contentSource = 'jlpt'
        }

        const config: FlashcardConfig = {
            flashcard_type: 'word',
            content_source: contentSource,
            course_id: courseId,
            unit_id: unitId,
            filters: {
                jlpt_levels: [level],
                parts_of_speech: selectedPartsOfSpeech,
                difficulty_levels: [],
                has_kanji: undefined
            },
            word_options: {
                show_kana: showKana,
                show_kanji: showKanji,
                show_romaji: showRomaji,
                show_english: showEnglish,
                show_part_of_speech: false,
                ask_for_kana: askForKana,
                ask_for_kanji: askForKanji,
                ask_for_romaji: askForRomaji,
                ask_for_english: askForEnglish,
                ask_for_part_of_speech: false,
            },
            card_count: count,
            shuffle_options: true,
            required_correct_count: requiredCorrectCount
        }

        startSessionMutation.mutate(config)
    }

    const handleOptionSelect = (optionIndex: number) => {
        if (selectedOption !== null || !session) return

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

    // Custom rendering for word content
    const renderWordQuestion = (card: Flashcard) => (
        <>
            {card.question.kanji && showKanji && (
                <h2 className={isMobile ? "text-5xl font-bold leading-tight" : "text-8xl font-bold"}>
                    {card.question.kanji}
                </h2>
            )}
            {card.question.kana && showKana && (
                <p className={isMobile ? "text-4xl text-primary font-medium" : "text-5xl text-primary"}>
                    {card.question.kana}
                </p>
            )}
            {card.question.romaji && showRomaji && (
                <p className={isMobile ? "text-base text-muted-foreground" : "text-4xl text-muted-foreground"}>
                    {card.question.romaji}
                </p>
            )}
        </>
    )

    const renderWordOption = (option: any) => {
        const parts = []
        if (askForEnglish && option.english) parts.push(option.english)
        if (askForKana && option.kana) parts.push(option.kana)
        if (askForKanji && option.kanji) parts.push(option.kanji)
        if (askForRomaji && option.romaji) parts.push(option.romaji)
        return parts.join(' • ') || 'No answer available'
    }

    // Render orchestration
    if (showResults && results) {
        return (
            <FlashcardResults
                results={results}
                onStudyAgain={startSession}
                onNewConfiguration={resetSession}
                isLoading={startSessionMutation.isPending}
                isMobile={isMobile}
            />
        )
    }

    // Only show config if explicitly requested or if we have no valid preferences
    if (showConfig || (!session && !hasAutoStarted && !startSessionMutation.isPending)) {
        return (
            <WordFlashcardConfig
                preferences={{
                    level,
                    selectedCourse,
                    selectedUnit,
                    count,
                    selectedPartsOfSpeech,
                    showKana,
                    showKanji,
                    showRomaji,
                    showEnglish,
                    askForKana,
                    askForKanji,
                    askForRomaji,
                    askForEnglish,
                    requiredCorrectCount
                }}
                courses={availableCourses}
                units={units}
                onLevelChange={setLevel}
                onCourseChange={setCourse}
                onUnitChange={setUnit}
                onCountChange={setCount}
                onPartsOfSpeechChange={setPartsOfSpeech}
                onShowOptionsChange={setShowOptions}
                onAskOptionsChange={setAskOptions}
                onThresholdChange={setRequiredCorrectCount}
                onStart={startSession}
                isLoading={startSessionMutation.isPending}
                isMobile={isMobile}
            />
        )
    }

    if (startSessionMutation.isPending || submitSessionMutation.isPending) {
        return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">Loading...</div>
    }

    if (!session || cards.length === 0) {
        return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">No words available</div>
    }

    // Use separate mobile component for better maintainability
    if (isMobile) {
        return (
            <MobileWordsFlashcard
                cards={cards}
                currentIndex={currentIndex}
                selectedOption={selectedOption}
                isCorrect={isCorrect}
                score={score}
                showKana={showKana}
                showKanji={showKanji}
                showRomaji={showRomaji}
                askForKana={askForKana}
                askForKanji={askForKanji}
                askForRomaji={askForRomaji}
                askForEnglish={askForEnglish}
                onOptionSelect={handleOptionSelect}
                onExit={() => setShowConfig(true)}
                onShowSettings={() => setShowConfig(true)}
                renderQuestion={renderWordQuestion}
                renderOption={renderWordOption}
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
            onOptionSelect={handleOptionSelect}
            onExit={() => setShowConfig(true)}
            onShowSettings={() => setShowConfig(true)}
            renderQuestion={renderWordQuestion}
            renderOption={renderWordOption}
            isMobile={false}
        />
    )
}