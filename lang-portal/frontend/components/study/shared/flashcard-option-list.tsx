"use client"

import { FlashcardOptionButton } from "./flashcard-option-button"
import type { Flashcard, FlashcardContent } from "@/types/api"

interface FlashcardOptionListProps {
  card: Flashcard
  selectedOption: number | null
  renderOption: (option: FlashcardContent) => React.ReactNode
  onOptionSelect: (index: number) => void
  isMobile?: boolean
}

export function FlashcardOptionList({
  card,
  selectedOption,
  renderOption,
  onOptionSelect,
  isMobile = false
}: FlashcardOptionListProps) {
  if (isMobile) {
    return (
      <div className="px-4 pb-safe pb-4 space-y-2.5">
        {card.options.map((option, index) => {
          const isCorrectAnswer = index === card.correct_index
          const isSelectedWrong = selectedOption === index && !isCorrectAnswer
          const isUnselected = selectedOption !== null && selectedOption !== index && !isCorrectAnswer

          return (
            <FlashcardOptionButton
              key={index}
              option={option}
              index={index}
              isCorrectAnswer={isCorrectAnswer}
              isSelectedWrong={isSelectedWrong}
              isUnselected={isUnselected}
              selectedOption={selectedOption}
              renderOption={renderOption}
              onSelect={onOptionSelect}
              isMobile={true}
            />
          )
        })}
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="grid grid-cols-2 gap-8">
      {card.options.map((option, index) => {
        const isCorrectAnswer = index === card.correct_index
        const isSelectedWrong = selectedOption === index && !isCorrectAnswer
        const isUnselected = selectedOption !== null && selectedOption !== index && !isCorrectAnswer

        return (
          <FlashcardOptionButton
            key={index}
            option={option}
            index={index}
            isCorrectAnswer={isCorrectAnswer}
            isSelectedWrong={isSelectedWrong}
            isUnselected={isUnselected}
            selectedOption={selectedOption}
            renderOption={renderOption}
            onSelect={onOptionSelect}
            isMobile={false}
          />
        )
      })}
    </div>
  )
}
