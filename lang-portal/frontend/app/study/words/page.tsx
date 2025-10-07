"use client"

import { WordsFlashcard } from "@/components/study/words-flashcard"

export default function WordsStudyPage() {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Vocabulary Study</h1>
                <p className="text-muted-foreground">
                    Practice Japanese vocabulary using our word flashcard system.
                </p>
            </div>
            <WordsFlashcard />
        </div>
    )
}
