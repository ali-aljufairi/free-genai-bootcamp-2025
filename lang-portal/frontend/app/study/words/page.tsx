"use client"

import { WordsFlashcard } from "@/components/study/words-flashcard"

export default function StudyWordsPage() {
    return (
        <div className="space-y-5">
            {/* Hide header on mobile to save space - user already knows context */}
            <div className="hidden md:flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Vocabulary Study</h1>
                <p className="text-muted-foreground">
                    Expand your Japanese vocabulary with our interactive flashcard system.
                </p>
            </div>
            <WordsFlashcard />
        </div>
    )
}


