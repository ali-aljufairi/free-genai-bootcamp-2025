"use client"

import { KanjiFlashcard } from "@/components/study/kanji-flashcard"

export default function StudyKanjiPage() {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Kanji Study</h1>
                <p className="text-muted-foreground">
                    Master kanji characters with our interactive flashcard system.
                </p>
            </div>
            <KanjiFlashcard />
        </div>
    )
}



