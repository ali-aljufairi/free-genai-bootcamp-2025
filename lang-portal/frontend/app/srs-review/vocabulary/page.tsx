"use client"

import { useEffect } from "react"
import { WordsFlashcard } from "@/components/study/words-flashcard"
import { SubscriptionGate } from "@/components/subscription/subscription-gate"
import { useWordFlashcardStore } from "@/stores/word-flashcard-store"

export default function VocabularySRSReviewPage() {
    const { setUseSRS } = useWordFlashcardStore()

    // Automatically enable SRS mode when this page loads
    useEffect(() => {
        setUseSRS(true)
        // Cleanup: disable SRS mode when leaving the page
        return () => {
            setUseSRS(false)
        }
    }, [setUseSRS])

    return (
        <SubscriptionGate feature="Vocabulary SRS Review">
            <div className="space-y-5">
                <div className="flex flex-col gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">Vocabulary SRS Review</h1>
                    <p className="text-muted-foreground">
                        Review vocabulary words that are due for spaced repetition practice.
                    </p>
                </div>
                <WordsFlashcard />
            </div>
        </SubscriptionGate>
    )
}
