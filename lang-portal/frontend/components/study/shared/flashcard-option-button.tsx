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
        return "!bg-green-500 hover:!bg-green-600 !text-white !border-green-600 shadow-xl shadow-green-500/30"
      }
      if (isSelectedWrong) {
        return "!bg-red-500 hover:!bg-red-500 !text-white !border-red-600 shadow-xl shadow-red-500/30"
      }
      return "opacity-50 bg-muted/20"
    }
    return "hover:bg-accent hover:scale-[1.02] active:scale-[0.98]"
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
          className={`w-full min-h-[60px] text-base font-medium transition-all duration-200 backdrop-blur-md border ${getButtonClasses()}`}
          variant="outline"
          onClick={() => onSelect(index)}
          disabled={selectedOption !== null}
        >
          <span className="line-clamp-2 px-2">
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
        className={`w-full p-10 h-auto text-3xl justify-center transition-all duration-200 border-2 ${getButtonClasses()}`}
        variant="outline"
        onClick={() => onSelect(index)}
        disabled={selectedOption !== null}
      >
        {renderOption(option)}
      </Button>
    </motion.div>
  )
}
