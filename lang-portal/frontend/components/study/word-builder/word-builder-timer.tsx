"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { Clock } from "lucide-react"

interface WordBuilderTimerProps {
  timeRemaining: number
  timeLimit: number
  isPlaying: boolean
}

export function WordBuilderTimer({ timeRemaining, timeLimit, isPlaying }: WordBuilderTimerProps) {
  const percentage = (timeRemaining / timeLimit) * 100
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Color based on remaining time
  let color = "text-green-500"
  let borderColor = "border-green-500"
  if (percentage < 30) {
    color = "text-red-500"
    borderColor = "border-red-500"
  } else if (percentage < 60) {
    color = "text-yellow-500"
    borderColor = "border-yellow-500"
  }

  return (
    <div className="flex items-center gap-3">
      <Clock className={`w-5 h-5 ${color}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-lg font-bold ${color}`}>{displayTime}</span>
          <span className="text-xs text-muted-foreground">
            {Math.round(percentage)}% remaining
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${percentage < 30 ? 'bg-red-500' : percentage < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
            initial={{ width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}

