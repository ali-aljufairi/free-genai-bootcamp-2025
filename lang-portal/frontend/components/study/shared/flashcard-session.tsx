"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Settings, Menu } from "lucide-react"
import { FlashcardProgress } from "./flashcard-progress"
import { FlashcardQuestionCard } from "./flashcard-question-card"
import { FlashcardOptionList } from "./flashcard-option-list"
import type { Flashcard, FlashcardContent } from "@/types/api"

interface FlashcardSessionProps {
  cards: Flashcard[]
  currentIndex: number
  selectedOption: number | null
  isCorrect: boolean | null
  score: number
  timeRemaining?: number
  timerDuration?: number
  onOptionSelect: (index: number) => void
  onExit: () => void
  onShowSettings?: () => void
  
  // Custom rendering based on type
  renderQuestion: (card: Flashcard) => React.ReactNode
  renderOption: (option: FlashcardContent) => React.ReactNode
  
  isMobile: boolean
}

export function FlashcardSession({
  cards,
  currentIndex,
  selectedOption,
  isCorrect,
  score,
  timeRemaining,
  timerDuration,
  onOptionSelect,
  onExit,
  onShowSettings,
  renderQuestion,
  renderOption,
  isMobile
}: FlashcardSessionProps) {
  const router = useRouter()
  const currentCard = cards[currentIndex]

  if (isMobile) {
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
          timeRemaining={timeRemaining}
          timerDuration={timerDuration}
          onShowSettings={onShowSettings || (() => {})}
          isMobile={true}
        />

        {/* Question Card */}
        <FlashcardQuestionCard
          card={currentCard}
          selectedOption={selectedOption}
          isCorrect={isCorrect}
          explanation={(currentCard as any).explanation}
          renderQuestion={renderQuestion}
          renderOption={renderOption}
          onOptionSelect={onOptionSelect}
          isMobile={true}
        />

        {/* Answer Options */}
        <FlashcardOptionList
          card={currentCard}
          selectedOption={selectedOption}
          renderOption={renderOption}
          onOptionSelect={onOptionSelect}
          isMobile={true}
        />
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="space-y-6">
      {/* Progress Bar with Settings Button */}
      <FlashcardProgress
        currentIndex={currentIndex}
        totalCards={cards.length}
        score={score}
        timeRemaining={timeRemaining}
        timerDuration={timerDuration}
        onShowSettings={onShowSettings || (() => {})}
        isMobile={false}
      />

      {/* Question Card with Options inside */}
      <FlashcardQuestionCard
        card={currentCard}
        selectedOption={selectedOption}
        isCorrect={isCorrect}
        explanation={(currentCard as any).explanation}
        renderQuestion={renderQuestion}
        renderOption={renderOption}
        onOptionSelect={onOptionSelect}
        isMobile={false}
      />
    </div>
  )
}
