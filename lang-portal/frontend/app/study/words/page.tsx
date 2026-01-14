"use client"

import { WordsFlashcard } from "@/components/study/words-flashcard"
import { SubscriptionGate } from "@/components/subscription/subscription-gate"
import { useRouter } from "next/navigation"
import { navigateWithTransition } from "@/lib/view-transitions"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function WordsStudyPage() {
    const router = useRouter()

    const handleBack = async () => {
        await navigateWithTransition(router, "/study", {
            transitionName: 'page',
        })
    }

    return (
        <SubscriptionGate feature="Vocabulary Flashcards">
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
                        <h1 className="text-3xl font-bold tracking-tight">Vocabulary Study</h1>
                        <p className="text-muted-foreground">
                            Practice Japanese vocabulary using our word flashcard system.
                        </p>
                    </div>
                </div>
                <WordsFlashcard />
            </div>
        </SubscriptionGate>
    )
}
