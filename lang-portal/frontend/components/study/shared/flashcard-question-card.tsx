"use client"

import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { FlashcardOptionList } from "./flashcard-option-list"
import type { Flashcard, FlashcardContent } from "@/types/api"

interface FlashcardQuestionCardProps {
    card: Flashcard
    selectedOption: number | null
    isCorrect?: boolean | null
    explanation?: string | null
    showExplanations?: boolean
    showOnlyOnIncorrect?: boolean
    renderQuestion: (card: Flashcard) => React.ReactNode
    renderOption: (option: FlashcardContent) => React.ReactNode
    onOptionSelect: (index: number) => void
    isMobile?: boolean
}

export function FlashcardQuestionCard({
    card,
    selectedOption,
    isCorrect,
    explanation,
    showExplanations = true,
    showOnlyOnIncorrect = true,
    renderQuestion,
    renderOption,
    onOptionSelect,
    isMobile = false
}: FlashcardQuestionCardProps) {
    const shouldShowExplanation =
        selectedOption !== null &&
        showExplanations &&
        !!explanation &&
        (!showOnlyOnIncorrect || isCorrect === false)

    if (isMobile) {
        return (
            <div className="flex-1 flex items-center justify-center px-4 py-4">
                <Card className="glass-card w-full max-w-md">
                    <CardContent className="p-6">
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-center space-y-2 min-h-[120px] flex flex-col items-center justify-center"
                        >
                            {renderQuestion(card)}

                            {/* Show explanation after answer when enabled */}
                            {shouldShowExplanation && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                    className="mt-4 p-3 bg-muted/50 rounded-lg border border-muted w-full"
                                >
                                    <p className="text-sm text-muted-foreground font-medium mb-1">Explanation:</p>
                                    <div
                                        className="text-sm text-left"
                                        dangerouslySetInnerHTML={{ __html: explanation }}
                                    />
                                </motion.div>
                            )}
                        </motion.div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Desktop layout - include options inside the card
    return (
        <Card className="glass-card min-h-[70vh]">
            <CardContent className="p-12 h-full flex flex-col justify-center">
                <div className="max-w-4xl mx-auto w-full">
                    <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="text-center mb-16 space-y-6"
                    >
                        {renderQuestion(card)}

                        {/* Show explanation after answer when enabled */}
                        {shouldShowExplanation && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                                className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted max-w-2xl mx-auto"
                            >
                                <p className="text-sm text-muted-foreground font-medium mb-2">Explanation:</p>
                                <div
                                    className="text-sm text-left"
                                    dangerouslySetInnerHTML={{ __html: explanation }}
                                />
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Answer Options inside the same card */}
                    <FlashcardOptionList
                        card={card}
                        selectedOption={selectedOption}
                        renderOption={renderOption}
                        onOptionSelect={onOptionSelect}
                        isMobile={false}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
