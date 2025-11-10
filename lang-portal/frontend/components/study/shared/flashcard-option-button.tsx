"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import type { FlashcardContent } from "@/types/api"

interface FlashcardOptionButtonProps {
  option: FlashcardContent
  index: number
  isCorrectAnswer: boolean
  isSelectedWrong: boolean
  isUnselected: boolean
  selectedOption: number | null
  renderOption: (option: FlashcardContent) => React.ReactNode
  onSelect: (index: number) => void
  isMobile?: boolean
}

export function FlashcardOptionButton({
  option,
  index,
  isCorrectAnswer,
  isSelectedWrong,
  isUnselected,
  selectedOption,
  renderOption,
  onSelect,
  isMobile = false
}: FlashcardOptionButtonProps) {
  const getButtonClasses = () => {
    if (selectedOption !== null) {
      if (isCorrectAnswer) {
        return "!bg-green-500/90 hover:!bg-green-500/95 !text-white !border-green-400/50 shadow-lg shadow-green-500/30 backdrop-blur-sm"
      }
      if (isSelectedWrong) {
        return "!bg-red-500/90 hover:!bg-red-500/95 !text-white !border-red-400/50 shadow-lg shadow-red-500/30 backdrop-blur-sm"
      }
      return "opacity-40 bg-muted/10 border-muted/30 backdrop-blur-sm"
    }
    return "glass-card-option hover:scale-[1.01] active:scale-[0.99]"
  }

  if (isMobile) {
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
      >
        <Button
          className={`w-full min-h-[65px] max-h-[120px] text-base font-medium transition-all duration-200 overflow-hidden ${getButtonClasses()}`}
          variant="outline"
          onClick={() => onSelect(index)}
          disabled={selectedOption !== null}
        >
          <span className="px-3 text-center break-words hyphens-auto w-full whitespace-normal">
            {renderOption(option)}
          </span>
        </Button>
      </motion.div>
    )
  }

  // Desktop layout
  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Button
        className={`w-full p-8 h-auto min-h-[100px] max-h-[200px] text-2xl justify-center transition-all duration-200 overflow-hidden ${getButtonClasses()}`}
        variant="outline"
        onClick={() => onSelect(index)}
        disabled={selectedOption !== null}
      >
        <span className="text-center break-words hyphens-auto leading-tight w-full px-2 whitespace-normal">
          {renderOption(option)}
        </span>
      </Button>
    </motion.div>
  )
}
