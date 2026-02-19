"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { readingApi } from "@/services/api"
import type {
    ReadingQuestion,
    ReadingQuizConfig,
    ReadingQuizSession,
    ReadingAnswer,
    ReadingSubmission,
    ReadingResult,
    Flashcard
} from "@/types/api"
import { useReadingStore } from "@/stores/reading-store"
import { useIsMobile } from "@/components/ui/use-mobile"
import { useUserSettingsStore } from "@/stores/user-settings-store"
import { useStudySessionRestartGuard } from "@/hooks/use-study-session-restart-guard"
import { ReadingQuizConfig as ReadingQuizConfigComponent } from "./configs/reading-quiz-config"
import { FlashcardResults } from "./shared/flashcard-results"
import { MobileReadingQuiz } from "./mobile/mobile-reading-quiz"
import { FlashcardSkeleton } from "./shared/flashcard-skeleton"
import { ConfigSkeleton } from "./configs/config-skeleton"
import { FlashcardQuestionCard } from "./shared/flashcard-question-card"
import { FlashcardOptionList } from "./shared/flashcard-option-list"
import { SessionRestartDialog } from "./shared/session-restart-dialog"
import { Button } from "@/components/ui/button"
import { Settings, Clock } from "lucide-react"

const defaultReadingPreferences = {
    level: 5,
    questionType: 'all' as const,
    useSRS: false,
    count: 10,
    requiredCorrectCount: 3,
    timerDuration: 0,
}

// Check if preferences differ from defaults (user has configured)
function hasConfiguredReadingPreferences(prefs: typeof defaultReadingPreferences): boolean {
    return (
        prefs.level !== defaultReadingPreferences.level ||
        prefs.questionType !== defaultReadingPreferences.questionType ||
        prefs.useSRS !== defaultReadingPreferences.useSRS ||
        prefs.count !== defaultReadingPreferences.count ||
        prefs.requiredCorrectCount !== defaultReadingPreferences.requiredCorrectCount ||
        prefs.timerDuration !== defaultReadingPreferences.timerDuration
    )
}

export function ReadingQuiz() {
    const isMobile = useIsMobile()

    // State
    const [session, setSession] = useState<ReadingQuizSession | null>(null)
    const [questions, setQuestions] = useState<ReadingQuestion[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [showConfig, setShowConfig] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [results, setResults] = useState<ReadingResult | null>(null)
    const [answers, setAnswers] = useState<ReadingAnswer[]>([])
    const [score, setScore] = useState(0)
    const [hasAutoStarted, setHasAutoStarted] = useState(false)

    // Timer state
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [isTimerActive, setIsTimerActive] = useState(false)

    // Background submission state
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Zustand store
    const store = useReadingStore()
    const queryClient = useQueryClient()
    const globalJlptLevel = useUserSettingsStore((s) => s.currentJlptLevel)
    const {
        level, questionType, useSRS, count, requiredCorrectCount, timerDuration,
        setLevel, setQuestionType, setUseSRS, setCount, setRequiredCorrectCount, setTimerDuration
    } = store

    const effectiveLevel = level === 5 && globalJlptLevel ? globalJlptLevel : level

    const buildRestartSignature = () => {
        return JSON.stringify({
            level: effectiveLevel,
            questionType,
            useSRS,
            count,
            requiredCorrectCount,
        })
    }

    const getConfigSignature = (config: ReadingQuizConfig) => {
        return JSON.stringify({
            level: config.level,
            questionType: config.question_type,
            useSRS: config.use_srs,
            count: config.question_count,
            requiredCorrectCount: config.required_correct_count ?? requiredCorrectCount,
        })
    }

    const restoreConfig = (config: ReadingQuizConfig) => {
        setLevel(config.level)
        setQuestionType(config.question_type)
        setUseSRS(config.use_srs)
        setCount(config.question_count)
        setRequiredCorrectCount(config.required_correct_count ?? requiredCorrectCount)
    }

    // Auto-start if user has configured preferences, otherwise show config
    useEffect(() => {
        if (!hasAutoStarted) {
            const prefs = { level, questionType, useSRS, count, requiredCorrectCount, timerDuration }
            if (hasConfiguredReadingPreferences(prefs)) {
                // User has configured preferences - auto-start
                setHasAutoStarted(true)
                startSession()
            } else {
                // First time or default preferences - show config
                setShowConfig(true)
                setHasAutoStarted(true)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Timer countdown effect
    useEffect(() => {
        if (!isTimerActive || timeRemaining <= 0) return

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Timer expired - auto-select wrong answer
                    const currentQuestion = questions[currentIndex]
                    const answers = currentQuestion?.answers
                    const wrongOptions = (answers && Array.isArray(answers) && answers.length > 0)
                        ? answers
                            .map((_, index) => index)
                            .filter(index => index !== currentQuestion?.correct_index)
                        : []

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
    }, [isTimerActive, timeRemaining, currentIndex, questions])

    // Start timer when new question is shown
    useEffect(() => {
        if (session && questions && Array.isArray(questions) && questions.length > 0 && timerDuration > 0) {
            setTimeRemaining(timerDuration)
            setIsTimerActive(true)
        }
    }, [currentIndex, session, questions, timerDuration])

    // Mutations
    const startSessionMutation = useMutation({
        mutationFn: (config: ReadingQuizConfig) => readingApi.start(config),
        onSuccess: (data, config) => {
            setSession(data)
            setQuestions(data.questions && Array.isArray(data.questions) ? data.questions : [])
            setCurrentIndex(0)
            setSelectedOption(null)
            setIsCorrect(null)
            setAnswers([])
            setScore(0)
            setShowConfig(false)
            setShowResults(false)
            restartGuard.rememberActiveSession(config)
        },
        onError: (error) => {
            alert("Failed to start quiz. Please try again.")
        }
    })

    // Calculate results locally without waiting for backend
    const calculateLocalResults = (finalAnswers: ReadingAnswer[]): ReadingResult => {
        const validQuestions = questions && Array.isArray(questions) ? questions : []

        const correctCount = finalAnswers.filter(answer => {
            const question = validQuestions.find(q => q.id === answer.question_id)
            return question && answer.answer === question.correct_index
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
            duration: 0,
            results: finalAnswers.map(answer => {
                const question = validQuestions.find(q => q.id === answer.question_id)
                return {
                    question_id: answer.question_id,
                    item_id: question?.id || 0,
                    item_type: 'reading',
                    user_answer: answer.answer,
                    correct_index: question?.correct_index || 0,
                    is_correct: question ? answer.answer === question.correct_index : false
                }
            })
        }
    }

    const submitSessionMutation = useMutation({
        mutationFn: (submission: ReadingSubmission) => readingApi.submit(submission),
        onSuccess: () => {
            setIsSubmitting(false)
            prefetchNextSession()
        },
        onError: () => {
            setIsSubmitting(false)
        }
    })

    // Prefetch next session function
    const prefetchNextSession = async () => {
        try {
            const config: ReadingQuizConfig = {
                level: effectiveLevel,
                question_type: questionType,
                use_srs: useSRS,
                question_count: count,
                shuffle_options: true,
                required_correct_count: requiredCorrectCount,
                time_limit: timerDuration > 0 ? timerDuration : undefined
            }

            // Create cache key based on config
            const cacheKey = ['reading-session', JSON.stringify(config)]

            // Prefetch the session
            await queryClient.prefetchQuery({
                queryKey: cacheKey,
                queryFn: () => readingApi.start(config),
                staleTime: 2 * 60 * 1000, // 2 minutes
            })
        } catch {
            // Prefetch failed, non-critical
        }
    }

    const startSession = async () => {
        const config: ReadingQuizConfig = {
            level: effectiveLevel,
            question_type: questionType,
            use_srs: useSRS,
            question_count: count,
            shuffle_options: true,
            required_correct_count: requiredCorrectCount,
            time_limit: timerDuration > 0 ? timerDuration : undefined
        }

        // Check for cached session first
        const cacheKey = ['reading-session', JSON.stringify(config)]
        const cachedData = queryClient.getQueryData(cacheKey)

        if (cachedData) {
            const data = cachedData as ReadingQuizSession
            setSession(data)
            setQuestions(data.questions && Array.isArray(data.questions) ? data.questions : [])
            setCurrentIndex(0)
            setSelectedOption(null)
            setIsCorrect(null)
            setAnswers([])
            setScore(0)
            setShowConfig(false)
            setShowResults(false)
            restartGuard.rememberActiveSession(config)
            return
        }

        startSessionMutation.mutate(config)
    }

    const restartGuard = useStudySessionRestartGuard<ReadingQuizConfig>({
        getCurrentSignature: buildRestartSignature,
        getConfigSignature,
        restoreConfig,
        onContinueCurrentSession: () => setShowConfig(false),
        onStartNewSession: () => {
            void startSession()
        },
    })

    const handleConfigStart = () => {
        restartGuard.handleConfigStart({
            hasActiveSession: Boolean(session) && !showResults,
            hasProgress: answers.length > 0 || currentIndex > 0,
        })
    }

    const handleOptionSelect = (optionIndex: number) => {
        if (selectedOption !== null || !session) return

        const currentQuestion = questions[currentIndex]
        if (!currentQuestion || !currentQuestion.answers || !Array.isArray(currentQuestion.answers)) {
            return
        }

        // Pause timer when answer is selected
        setIsTimerActive(false)

        setSelectedOption(optionIndex)
        const correct = optionIndex === currentQuestion.correct_index
        setIsCorrect(correct)
        if (correct) {
            setScore(prev => prev + 1)
        }

        const answer: ReadingAnswer = {
            question_id: currentQuestion.id,
            answer: optionIndex,
        }
        setAnswers(prev => [...prev, answer])

        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1)
                setSelectedOption(null)
                setIsCorrect(null)
            } else {
                submitSession([...answers, answer])
            }
        }, 1500)
    }

    const submitSession = async (finalAnswers: ReadingAnswer[]) => {
        if (!session) return

        // Calculate and show results instantly
        const localResults = calculateLocalResults(finalAnswers)
        setResults(localResults)
        setShowResults(true)

        // Submit to backend in background
        setIsSubmitting(true)
        const submission: ReadingSubmission = {
            session_id: session.id,
            answers: finalAnswers,
        }

        submitSessionMutation.mutate(submission)
    }

    const resetSession = () => {
        setSession(null)
        setQuestions([])
        setCurrentIndex(0)
        setSelectedOption(null)
        setIsCorrect(null)
        setAnswers([])
        setScore(0)
        setShowConfig(true)
        setShowResults(false)
        setResults(null)
        restartGuard.clearActiveSession()
    }

    const renderReadingQuestion = (question: ReadingQuestion) => {
        // For reading questions, passages may be present for any question type.
        // Check if there are multiple questions sharing the same passage.
        const passageQuestionCount = question.passage
            ? questions.filter(q => q.passage && q.passage === question.passage).length
            : 0
        
        const passageQuestionIndex = question.passage && passageQuestionCount > 0
            ? questions.filter(q => q.passage && q.passage === question.passage)
                .sort((a, b) => a.question_text.localeCompare(b.question_text))
                .findIndex(q => q.id === question.id) + 1
            : 0

        return (
            <div className="flex flex-col items-center gap-4 w-full">
                {question.passage && (
                    <div className={`w-full ${isMobile ? 'max-w-full max-h-[250px]' : 'max-w-4xl max-h-[400px]'} mb-4 p-4 bg-muted/30 rounded-lg border border-muted overflow-y-auto`}>
                        {/* Render passage as HTML so <div>, <br>, etc. display properly */}
                        <div
                            className="text-sm leading-relaxed font-japanese"
                            dangerouslySetInnerHTML={{ __html: question.passage }}
                        />
                    </div>
                )}
                {question.passage && passageQuestionCount > 1 && (
                    <div className="text-sm text-muted-foreground mb-2">
                        Question {passageQuestionIndex} of {passageQuestionCount} in this passage
                    </div>
                )}
                <p className={isMobile ? "text-2xl font-medium leading-relaxed text-center" : "text-4xl font-medium leading-relaxed text-center"}>
                    {question.question_text.trim()}
                </p>
            </div>
        )
    }

    const renderReadingOption = (option: string) => {
        return option
    }

    // Render orchestration
    if (showResults && results) {
        return (
            <FlashcardResults
                results={{
                    session_id: results.session_id,
                    score: results.score,
                    total: results.total,
                    percentage: results.percentage,
                    correct_count: results.correct_count,
                    wrong_count: results.wrong_count,
                    duration: results.duration,
                    results: results.results.map(r => ({
                        card_id: r.question_id,
                        item_id: r.item_id,
                        item_type: r.item_type,
                        user_answer: r.user_answer,
                        correct_index: r.correct_index,
                        is_correct: r.is_correct
                    }))
                }}
                onStudyAgain={startSession}
                onNewConfiguration={resetSession}
                isLoading={startSessionMutation.isPending || isSubmitting}
                isMobile={isMobile}
                isSubmitting={isSubmitting}
            />
        )
    }

    // Show config skeleton when loading
    if (showConfig && startSessionMutation.isPending) {
        return <ConfigSkeleton isMobile={isMobile} />
    }

    // Only show config if explicitly requested or if we have no valid preferences
    if (showConfig || (!session && !hasAutoStarted && !startSessionMutation.isPending)) {
        return (
            <>
                <ReadingQuizConfigComponent
                    preferences={{
                        level,
                        questionType,
                        useSRS,
                        count,
                        requiredCorrectCount,
                        timerDuration
                    }}
                    onLevelChange={setLevel}
                    onQuestionTypeChange={setQuestionType}
                    onUseSRSChange={setUseSRS}
                    onCountChange={setCount}
                    onThresholdChange={setRequiredCorrectCount}
                    onTimerChange={setTimerDuration}
                    onStart={handleConfigStart}
                    isLoading={startSessionMutation.isPending}
                    isMobile={isMobile}
                />

                <SessionRestartDialog
                    open={restartGuard.showRestartDialog}
                    onOpenChange={restartGuard.setShowRestartDialog}
                    title="Start a new reading test?"
                    description="These changes require a new test session. Your current progress will be lost."
                    checkboxId="reading-restart-warning"
                    dontShowAgain={restartGuard.dontShowRestartDialogAgain}
                    onDontShowAgainChange={restartGuard.setDontShowRestartDialogAgain}
                    onKeepCurrent={restartGuard.keepCurrentSession}
                    onStartNew={restartGuard.startNewSession}
                    keepCurrentLabel="Keep Current Test"
                    startNewLabel="Start New Test"
                />
            </>
        )
    }

    // Show flashcard skeleton when starting session
    if (startSessionMutation.isPending) {
        return <FlashcardSkeleton isMobile={isMobile} />
    }

    if (!session || !questions || !Array.isArray(questions) || questions.length === 0) {
        const emptyMessage = useSRS
            ? "There are no items for Review"
            : "No questions available"
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <div className="text-center space-y-2">
                    <p className="text-lg font-medium">{emptyMessage}</p>
                    {useSRS && (
                        <p className="text-sm text-muted-foreground">
                            Try adjusting your filters or study more content to generate review items.
                        </p>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => setShowConfig(true)}
                        className="mt-4"
                    >
                        Change Settings
                    </Button>
                </div>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]

    if (!currentQuestion || !currentQuestion.answers || !Array.isArray(currentQuestion.answers) || currentQuestion.answers.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <div className="text-center space-y-2">
                    <p className="text-lg font-medium">Invalid question data</p>
                    <p className="text-sm text-muted-foreground">
                        The current question is missing required data. Please try again.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => setShowConfig(true)}
                        className="mt-4"
                    >
                        Change Settings
                    </Button>
                </div>
            </div>
        )
    }

    // Use separate mobile component for better maintainability
    if (isMobile) {
        return (
            <MobileReadingQuiz
                question={currentQuestion}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                selectedOption={selectedOption}
                isCorrect={isCorrect}
                score={score}
                timeRemaining={timeRemaining}
                timerDuration={timerDuration}
                onOptionSelect={handleOptionSelect}
                onExit={() => setShowConfig(true)}
                onShowSettings={() => setShowConfig(true)}
                renderQuestion={renderReadingQuestion}
                renderOption={renderReadingOption}
            />
        )
    }

    const flashcardFormats = questions.map(q => {
        const answers = q.answers && Array.isArray(q.answers) && q.answers.length > 0
            ? q.answers
            : []

        return {
            id: q.id,
            type: 'word' as const,
            question: { question_text: q.question_text },
            answer: { answer: answers[q.correct_index] || '' },
            options: answers.map((answer) => ({ answer })),
            correct_index: q.correct_index,
            item_id: q.id,
            item_type: 'reading' as const,
            explanation: q.explanation,
        } as Flashcard
    })

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex justify-between text-lg text-muted-foreground items-center">
                    <span>Question {currentIndex + 1} of {questions.length}</span>
                    <div className="flex items-center gap-4">
                        {timerDuration && timeRemaining !== undefined && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{timeRemaining}s</span>
                            </div>
                        )}
                        <span>Score: {score}/{questions.length}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfig(true)}
                            className="h-8 px-3 gap-2"
                        >
                            <Settings className="h-4 w-4" />
                            Settings
                        </Button>
                    </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                    <div
                        className="bg-primary h-3 rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {flashcardFormats[currentIndex] && (
                <FlashcardQuestionCard
                    card={flashcardFormats[currentIndex]}
                    selectedOption={selectedOption}
                    isCorrect={isCorrect}
                    explanation={currentQuestion?.explanation}
                    renderQuestion={(card) => {
                        const q = questions.find(q => q.id === card.id) || currentQuestion
                        return renderReadingQuestion(q)
                    }}
                    renderOption={(option) => {
                        const optionText = typeof option === 'string' ? option : (option as any).answer || ''
                        return renderReadingOption(optionText)
                    }}
                    onOptionSelect={handleOptionSelect}
                    isMobile={false}
                />
            )}
        </div>
    )
}
