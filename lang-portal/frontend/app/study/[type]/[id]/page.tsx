"use client"

import { useRouter } from "next/navigation"
import { UnifiedFlashcard } from "@/components/study/unified-flashcard"
import { KanjiFlashcard } from "@/components/study/kanji-flashcard"
import { WordsFlashcard } from "@/components/study/words-flashcard"
import { QuizStudy } from "@/components/study/quiz-study"
import { DrawingStudy } from "@/components/study/drawing-study"
import { AgentStudy } from "@/components/study/agent-study"
import { Chat } from "@/components/study/chat-study"
import { SpeechStudy } from "@/components/study/speech-study"
import React from "react"
import { navigateWithTransition } from "@/lib/view-transitions"
import { SubscriptionGate } from "@/components/subscription/subscription-gate"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function StudySessionPage({
    params
}: {
    params: Promise<{ type: string; id: string }>
}) {
    // Use React.use to unwrap the params promise
    const { type, id } = React.use(params)

    const router = useRouter()

    const handleComplete = async () => {
        await navigateWithTransition(router, "/dashboard", {
            transitionName: 'page',
        })
    }

    // Get feature name for display
    const featureName = {
        flashcards: "Flashcards",
        kanji: "Kanji Flashcards",
        words: "Word Flashcards",
        quiz: "Quiz",
        drawing: "Writing Practice",
        agent: "AI Learning Agent",
        chat: "AI Chat",
        speech: "Speech-to-Image",
    }[type] || "Study Session"

    const handleBack = async () => {
        await navigateWithTransition(router, "/study", {
            transitionName: 'page',
        })
    }

    return (
        <SubscriptionGate feature={featureName}>
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="h-9 w-9 p-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col gap-3 flex-1">
                        <h1 className="text-3xl font-bold tracking-tight">Study Session</h1>
                    </div>
                </div>

                {type === "flashcards" && (
                    <UnifiedFlashcard />
                )}

                {type === "kanji" && (
                    <KanjiFlashcard />
                )}

                {type === "words" && (
                    <WordsFlashcard />
                )}

                {type === "quiz" && (
                    <QuizStudy sessionId={id} onComplete={handleComplete} />
                )}

                {type === "drawing" && (
                    <DrawingStudy />
                )}

                {type === "agent" && (
                    <AgentStudy sessionId={id} onComplete={handleComplete} />
                )}

                {type === "chat" && (
                    <Chat sessionId={id} onComplete={handleComplete} />
                )}

                {type === "speech" && (
                    <SpeechStudy sessionId={id} onComplete={handleComplete} />
                )}
            </div>
        </SubscriptionGate>
    )
}