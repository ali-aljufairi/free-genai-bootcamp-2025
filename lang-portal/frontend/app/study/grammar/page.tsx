"use client"

import { GrammarQuiz } from "@/components/study/grammar-quiz"

export default function GrammarQuizPage() {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Grammar Quiz</h1>
                <p className="text-muted-foreground">
                    Practice Japanese grammar with multiple choice questions from JLPT levels.
                </p>
            </div>
            <GrammarQuiz />
        </div>
    )
}

