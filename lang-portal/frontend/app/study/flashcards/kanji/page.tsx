"use client"

import { KanjiFlashcard } from "@/components/study/kanji-flashcard"
import { SubscriptionGate } from "@/components/subscription/subscription-gate"

export default function KanjiFlashcardPage() {
    return (
        <SubscriptionGate feature="Kanji Flashcards">
            <div className="space-y-5">
                <div className="flex flex-col gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">Kanji Study</h1>
                    <p className="text-muted-foreground">
                        Practice kanji characters and their meanings using our new flashcard system.
                    </p>
                </div>
                <KanjiFlashcard />
            </div>
        </SubscriptionGate>
    )
}
