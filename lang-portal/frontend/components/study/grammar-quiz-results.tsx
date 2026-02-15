"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { GrammarResult } from "@/types/api"

export interface GrammarQuizReviewItem {
    questionId: number
    questionNumber: number
    questionText: string
    passage?: string | null
    selectedAnswerIndex: number
    selectedAnswerText: string
    correctAnswerIndex: number
    correctAnswerText: string
    explanation?: string | null
    isCorrect: boolean
}

interface GrammarQuizResultsProps {
    results: GrammarResult
    reviewItems: GrammarQuizReviewItem[]
    onStudyAgain: () => void
    onNewConfiguration: () => void
    isLoading: boolean
    isMobile: boolean
    isSubmitting?: boolean
}

export function GrammarQuizResults({
    results,
    reviewItems,
    onStudyAgain,
    onNewConfiguration,
    isLoading,
    isMobile,
    isSubmitting = false
}: GrammarQuizResultsProps) {
    return (
        <div className="flex flex-col min-h-[calc(100vh-8rem)]">
            <Card className="flex-1 glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                <CardContent className={`${isMobile ? "p-4" : "p-6"} h-full flex flex-col gap-5`}>
                    <section className="space-y-4">
                        <div className={`flex ${isMobile ? "flex-col" : "flex-col md:flex-row md:items-start md:justify-between"} gap-4`}>
                            <div className="space-y-1">
                                <h2 className={isMobile ? "text-2xl font-bold" : "text-3xl font-bold"}>
                                    Session Complete
                                </h2>
                                <p className={isMobile ? "text-lg font-semibold" : "text-xl font-semibold"}>
                                    Score: {results.correct_count}/{results.total}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {Math.round(results.percentage)}% Correct
                                </p>
                                {isSubmitting && (
                                    <p className="text-sm text-muted-foreground">
                                        Saving results...
                                    </p>
                                )}
                            </div>

                            <div className={`flex ${isMobile ? "flex-col" : "flex-col sm:flex-row"} gap-2 ${isMobile ? "w-full" : ""}`}>
                                <Button
                                    onClick={onStudyAgain}
                                    className={`${isMobile ? "w-full h-10" : "h-10"} bg-blue-600 hover:bg-blue-700`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Loading..." : "Study Again"}
                                </Button>
                                <Button
                                    onClick={onNewConfiguration}
                                    variant="outline"
                                    className={`${isMobile ? "w-full h-10" : "h-10"}`}
                                >
                                    New Configuration
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-border/50 pt-4 space-y-3">
                        <h3 className={isMobile ? "text-lg font-semibold" : "text-xl font-semibold"}>
                            Answer Review
                        </h3>
                        <div className="space-y-3">
                            {reviewItems.map((item) => (
                                <article
                                    key={item.questionNumber}
                                    className={`rounded-lg border p-3 space-y-3 ${item.isCorrect
                                        ? "border-green-500/30 bg-green-500/5"
                                        : "border-red-500/30 bg-red-500/5"
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Question {item.questionNumber}
                                        </p>
                                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${item.isCorrect ? "text-green-600" : "text-red-600"}`}>
                                            {item.isCorrect ? "Correct" : "Incorrect"}
                                        </span>
                                    </div>

                                    {item.passage && (
                                        <div className="p-3 rounded-md border border-border/60 bg-muted/20 max-h-52 overflow-y-auto">
                                            <div
                                                className="text-sm leading-relaxed font-japanese"
                                                dangerouslySetInnerHTML={{ __html: item.passage }}
                                            />
                                        </div>
                                    )}

                                    <div
                                        className={isMobile ? "text-base font-medium leading-relaxed" : "text-lg font-medium leading-relaxed"}
                                        dangerouslySetInnerHTML={{ __html: item.questionText }}
                                    />

                                    <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase text-muted-foreground">Your Answer</p>
                                            <div
                                                className="text-xs sm:text-sm p-2 rounded-md bg-background/70 border border-border/50"
                                                dangerouslySetInnerHTML={{ __html: item.selectedAnswerText }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase text-muted-foreground">Correct Answer</p>
                                            <div
                                                className="text-xs sm:text-sm p-2 rounded-md bg-background/70 border border-border/50"
                                                dangerouslySetInnerHTML={{ __html: item.correctAnswerText }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground">Explanation</p>
                                        <div
                                            className="text-xs sm:text-sm p-2.5 rounded-md bg-background/70 border border-border/50 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: item.explanation || "No explanation available." }}
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </CardContent>
            </Card>
        </div>
    )
}
