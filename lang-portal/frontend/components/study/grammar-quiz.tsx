"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { grammarApi } from "@/services/api"
import type {
    GrammarQuestion,
    GrammarQuizConfig,
    GrammarQuizSession,
    GrammarAnswer,
    GrammarSubmission,
    GrammarResult,
    Flashcard
} from "@/types/api"
import { useGrammarStore } from "@/stores/grammar-store"
import { useIsMobile } from "@/components/ui/use-mobile"
import { useUserSettingsStore } from "@/stores/user-settings-store"
import { GrammarQuizConfig as GrammarQuizConfigComponent } from "./configs/grammar-quiz-config"
import { FlashcardResults } from "./shared/flashcard-results"
import { MobileGrammarQuiz } from "./mobile/mobile-grammar-quiz"
import { FlashcardSkeleton } from "./shared/flashcard-skeleton"
import { ConfigSkeleton } from "./configs/config-skeleton"
import { FlashcardQuestionCard } from "./shared/flashcard-question-card"
import { Button } from "@/components/ui/button"
import { Settings, Clock } from "lucide-react"

export function GrammarQuiz() {
    const isMobile = useIsMobile()

    // State
    const [session, setSession] = useState<GrammarQuizSession | null>(null)
    const [questions, setQuestions] = useState<GrammarQuestion[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [showConfig, setShowConfig] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [results, setResults] = useState<GrammarResult | null>(null)
    const [answers, setAnswers] = useState<GrammarAnswer[]>([])
    const [score, setScore] = useState(0)
    const [hasAutoStarted, setHasAutoStarted] = useState(false)

    // Timer state
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [isTimerActive, setIsTimerActive] = useState(false)

    // Background submission state
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Zustand store
    const store = useGrammarStore()
    const queryClient = useQueryClient()
    const globalJlptLevel = useUserSettingsStore((s) => s.currentJlptLevel)
    const {
        level, questionType, useSRS, count, showExplanations, requiredCorrectCount, timerDuration,
        hasStarted, setHasStarted,
        setLevel, setQuestionType, setUseSRS, setCount, setShowExplanations, setRequiredCorrectCount, setTimerDuration
    } = store

    const effectiveLevel = level === 5 && globalJlptLevel ? globalJlptLevel : level

    // Show settings on first use; auto-start on subsequent visits
    useEffect(() => {
        if (!hasAutoStarted) {
            if (hasStarted) {
                setHasAutoStarted(true)
                startSession()
                return
            }

            setShowConfig(true)
            setHasAutoStarted(true)
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
        mutationFn: (config: GrammarQuizConfig) => grammarApi.start(config),
        onSuccess: (data) => {
            setSession(data)
            setQuestions(data.questions && Array.isArray(data.questions) ? data.questions : [])
            setCurrentIndex(0)
            setSelectedOption(null)
            setIsCorrect(null)
            setAnswers([])
            setScore(0)
            setShowConfig(false)
            setShowResults(false)
            setHasStarted(true)
        },
        onError: (error) => {
            alert("Failed to start quiz. Please try again.")
        }
    })

    // Calculate results locally without waiting for backend
    const calculateLocalResults = (finalAnswers: GrammarAnswer[]): GrammarResult => {
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
                    item_type: 'grammar',
                    user_answer: answer.answer,
                    correct_index: question?.correct_index || 0,
                    is_correct: question ? answer.answer === question.correct_index : false
                }
            })
        }
    }

    const submitSessionMutation = useMutation({
        mutationFn: (submission: GrammarSubmission) => grammarApi.submit(submission),
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
            const config: GrammarQuizConfig = {
                level: effectiveLevel,
                question_type: questionType,
                use_srs: useSRS,
                question_count: count,
                shuffle_options: true,
                required_correct_count: requiredCorrectCount,
                time_limit: timerDuration > 0 ? timerDuration : undefined
            }

            // Create cache key based on config
            const cacheKey = ['grammar-session', JSON.stringify(config)]

            // Prefetch the session
            await queryClient.prefetchQuery({
                queryKey: cacheKey,
                queryFn: () => grammarApi.start(config),
                staleTime: 2 * 60 * 1000, // 2 minutes
            })
        } catch {
            // Prefetch failed, non-critical
        }
    }

    const startSession = async () => {
        const config: GrammarQuizConfig = {
            level: effectiveLevel,
            question_type: questionType,
            use_srs: useSRS,
            question_count: count,
            shuffle_options: true,
            required_correct_count: requiredCorrectCount,
            time_limit: timerDuration > 0 ? timerDuration : undefined
        }

        // Check for cached session first
        const cacheKey = ['grammar-session', JSON.stringify(config)]
        const cachedData = queryClient.getQueryData(cacheKey)

        if (cachedData) {
            const data = cachedData as GrammarQuizSession
            setSession(data)
            setQuestions(data.questions && Array.isArray(data.questions) ? data.questions : [])
            setCurrentIndex(0)
            setSelectedOption(null)
            setIsCorrect(null)
            setAnswers([])
            setScore(0)
            setShowConfig(false)
            setShowResults(false)
            setHasStarted(true)
            return
        }

        startSessionMutation.mutate(config)
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

        const answer: GrammarAnswer = {
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

    const submitSession = async (finalAnswers: GrammarAnswer[]) => {
        if (!session) return

        // Calculate and show results instantly
        const localResults = calculateLocalResults(finalAnswers)
        setResults(localResults)
        setShowResults(true)

        // Submit to backend in background
        setIsSubmitting(true)
        const submission: GrammarSubmission = {
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
    }

    const renderGrammarQuestion = (question: GrammarQuestion) => {
        const passageQuestionCount = question.question_type === 'passage_grammar'
            ? questions.filter(q => q.question_id === question.question_id && q.question_type === 'passage_grammar').length
            : 0

        const passageQuestionIndex = question.question_type === 'passage_grammar' && passageQuestionCount > 0
            ? questions.filter(q => q.question_id === question.question_id && q.question_type === 'passage_grammar')
                .sort((a, b) => a.question_text.localeCompare(b.question_text))
                .findIndex(q => q.id === question.id) + 1
            : 0

        return (
            <div className="flex flex-col items-center gap-4 w-full">
                {question.question_type === 'passage_grammar' && question.passage && (
                    <div className={`w-full ${isMobile ? 'max-w-full max-h-[250px]' : 'max-w-4xl max-h-[400px]'} mb-4 p-4 bg-muted/30 rounded-lg border border-muted overflow-y-auto`}>
                        <div
                            className="text-sm leading-relaxed font-japanese"
                            dangerouslySetInnerHTML={{ __html: question.passage }}
                        />
                    </div>
                )}
                {question.question_type === 'passage_grammar' && passageQuestionCount > 1 && (
                    <div className="text-sm text-muted-foreground mb-2">
                        Question {passageQuestionIndex} of {passageQuestionCount} in this passage
                    </div>
                )}
                <div
                    className={isMobile ? "text-2xl font-medium leading-relaxed text-center" : "text-4xl font-medium leading-relaxed text-center"}
                    dangerouslySetInnerHTML={{ __html: question.question_text.trim() }}
                />
            </div>
        )
    }

    const renderGrammarOption = (option: string) => {
        return <span dangerouslySetInnerHTML={{ __html: option }} />
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
            <GrammarQuizConfigComponent
                preferences={{
                    level,
                    questionType,
                    useSRS,
                    count,
                    showExplanations,
                    requiredCorrectCount,
                    timerDuration
                }}
                onLevelChange={setLevel}
                onQuestionTypeChange={setQuestionType}
                onUseSRSChange={setUseSRS}
                onCountChange={setCount}
                onShowExplanationsChange={setShowExplanations}
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
            <MobileGrammarQuiz
                question={currentQuestion}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                selectedOption={selectedOption}
                score={score}
                timeRemaining={timeRemaining}
                timerDuration={timerDuration}
                onOptionSelect={handleOptionSelect}
                onShowSettings={() => setShowConfig(true)}
                renderQuestion={renderGrammarQuestion}
                renderOption={renderGrammarOption}
                showExplanations={showExplanations}
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
            item_type: 'grammar' as const,
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
                    showExplanations={showExplanations}
                    showOnlyOnIncorrect={false}
                    renderQuestion={(card) => {
                        const q = questions.find(q => q.id === card.id) || currentQuestion
                        return renderGrammarQuestion(q)
                    }}
                    renderOption={(option) => {
                        const optionText = typeof option === 'string' ? option : (option as any).answer || ''
                        return renderGrammarOption(optionText)
                    }}
                    onOptionSelect={handleOptionSelect}
                    isMobile={false}
                />
            )}
        </div>
    )
}
