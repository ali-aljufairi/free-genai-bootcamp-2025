"use client"

import { useEffect } from "react"
import { GrammarQuiz } from "@/components/study/grammar-quiz"
import { useGrammarStore } from "@/stores/grammar-store"

export default function GrammarSRSReviewPage() {
    const { setUseSRS } = useGrammarStore()

    // Automatically enable SRS mode when this page loads
    useEffect(() => {
        setUseSRS(true)
    }, [setUseSRS])

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Grammar SRS Review</h1>
                <p className="text-muted-foreground">
                    Review grammar questions that are due for spaced repetition practice.
                </p>
            </div>
            <GrammarQuiz />
        </div>
    )
}

