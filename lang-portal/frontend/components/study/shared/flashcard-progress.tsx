"use client"

import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

interface FlashcardProgressProps {
    currentIndex: number
    totalCards: number
    score: number
    onShowSettings: () => void
    isMobile?: boolean
}

export function FlashcardProgress({
    currentIndex,
    totalCards,
    score,
    onShowSettings,
    isMobile = false
}: FlashcardProgressProps) {
    const progressText = `Word ${currentIndex + 1} of ${totalCards}`
    const progressPercentage = ((currentIndex + 1) / totalCards) * 100

    if (isMobile) {
        return (
            <div className="px-4 py-2 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                        {progressText}
                    </span>
                    <span className="text-xs font-bold text-primary">{score} / {totalCards}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>
        )
    }

    // Desktop layout
    return (
        <div className="space-y-3">
            <div className="flex justify-between text-lg text-muted-foreground items-center">
                <span>{progressText}</span>
                <div className="flex items-center gap-4">
                    <span>Score: {score}/{totalCards}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onShowSettings}
                        className="h-8 px-3 gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Button>
                </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
                <div
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>
        </div>
    )
}
