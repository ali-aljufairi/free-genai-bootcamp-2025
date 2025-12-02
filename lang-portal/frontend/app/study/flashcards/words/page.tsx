"use client"

import { WordsFlashcard } from "@/components/study/words-flashcard"
import { SubscriptionGate } from "@/components/subscription/subscription-gate"

export default function WordsFlashcardPage() {
    return (
        <SubscriptionGate feature="Vocabulary Flashcards">
            <div className="space-y-5">
                <div className="flex flex-col gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">Vocabulary Study</h1>
                    <p className="text-muted-foreground">
                        Practice Japanese vocabulary using our new word flashcard system.
                    </p>
                </div>
                <WordsFlashcard />
            </div>
        </SubscriptionGate>
    )
}
