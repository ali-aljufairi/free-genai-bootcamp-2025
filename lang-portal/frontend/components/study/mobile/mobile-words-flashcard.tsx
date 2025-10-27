"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { X, Settings, Menu } from "lucide-react"
import { FlashcardProgress } from "../shared/flashcard-progress"
import type { Flashcard } from "@/types/api"

interface MobileWordsFlashcardProps {
    cards: Flashcard[]
    currentIndex: number
    selectedOption: number | null
    isCorrect: boolean | null
    score: number
    showKana: boolean
    showKanji: boolean
    showRomaji: boolean
    askForKana: boolean
    askForKanji: boolean
    askForRomaji: boolean
    askForEnglish: boolean
    onOptionSelect: (index: number) => void
    onExit: () => void
    onShowSettings?: () => void
    renderQuestion: (card: Flashcard) => React.ReactNode
    renderOption: (option: any) => React.ReactNode
}

export function MobileWordsFlashcard({
    cards,
    currentIndex,
    selectedOption,
    isCorrect,
    score,
    showKana,
    showKanji,
    showRomaji,
    askForKana,
    askForKanji,
    askForRomaji,
    askForEnglish,
    onOptionSelect,
    onExit,
    onShowSettings,
    renderQuestion,
    renderOption
}: MobileWordsFlashcardProps) {
    const router = useRouter()
    const currentCard = cards[currentIndex]

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Top Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 flex items-center justify-center"
                    onClick={() => {/* Add menu functionality if needed */ }}
                >
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1">
                    {onShowSettings && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onShowSettings}
                            className="h-9 w-9 p-0 flex items-center justify-center"
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/study")}
                        className="h-9 w-9 p-0 flex items-center justify-center"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Progress Bar */}
            <FlashcardProgress
                currentIndex={currentIndex}
                totalCards={cards.length}
                score={score}
                onShowSettings={onShowSettings || (() => { })}
                isMobile={true}
            />

            {/* Question Card */}
            <div className="flex-1 flex items-center justify-center px-4 py-4">
                <Card className="glass-card w-full max-w-md">
                    <CardContent className="p-6">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-center space-y-2 min-h-[120px] flex flex-col items-center justify-center"
                        >
                            {renderQuestion(currentCard)}
                        </motion.div>
                    </CardContent>
                </Card>
            </div>

            {/* Answer Options - Fixed layout issue by putting them inside a container */}
            <div className="px-4 pb-safe pb-4">
                <div className="space-y-2.5">
                    {currentCard.options.map((option, index) => {
                        const isCorrectAnswer = index === currentCard.correct_index
                        const isSelectedWrong = selectedOption === index && !isCorrectAnswer
                        const isUnselected = selectedOption !== null && selectedOption !== index && !isCorrectAnswer

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                                <Button
                                    className={`w-full min-h-[60px] text-base font-medium transition-all duration-200 backdrop-blur-md border ${selectedOption !== null
                                        ? isCorrectAnswer
                                            ? "!bg-green-500/90 hover:!bg-green-500/95 !text-white !border-green-400/50 shadow-lg shadow-green-500/30 backdrop-blur-sm"
                                            : isSelectedWrong
                                                ? "!bg-red-500/90 hover:!bg-red-500/95 !text-white !border-red-400/50 shadow-lg shadow-red-500/30 backdrop-blur-sm"
                                                : "opacity-40 bg-muted/10 border-muted/30 backdrop-blur-sm"
                                        : "bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 border-white/10 dark:border-white/10 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 hover:scale-[1.01] active:scale-[0.99]"
                                        }`}
                                    variant="outline"
                                    onClick={() => onOptionSelect(index)}
                                    disabled={selectedOption !== null}
                                >
                                    <span className="line-clamp-2 px-2">
                                        {renderOption(option)}
                                    </span>
                                </Button>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
