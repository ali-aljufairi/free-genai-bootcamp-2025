"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, RotateCcw, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import type { WordBuilderValidWord } from "@/types/api"

interface WordBuilderResultsProps {
  wordsFormed: number
  totalAttempts: number
  timeSpent: number
  formedWords: WordBuilderValidWord[]
  onRestart: () => void
}

export function WordBuilderResults({
  wordsFormed,
  totalAttempts,
  timeSpent,
  formedWords,
  onRestart,
}: WordBuilderResultsProps) {
  const accuracy = totalAttempts > 0 ? Math.round((wordsFormed / totalAttempts) * 100) : 0
  const minutes = Math.floor(timeSpent / 60)
  const seconds = timeSpent % 60
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <CardTitle className="text-2xl">Game Complete!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-green-500 mb-1">{wordsFormed}</div>
              <div className="text-sm text-muted-foreground">Words Formed</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-blue-500 mb-1">{totalAttempts}</div>
              <div className="text-sm text-muted-foreground">Total Attempts</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-purple-500 mb-1">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>

          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-lg font-semibold mb-1">Time Spent</div>
            <div className="text-2xl font-bold">{timeDisplay}</div>
          </div>

          {/* Formed Words List */}
          {formedWords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">Words You Formed</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {formedWords.map((word, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="font-semibold text-lg">{word.kanji}</div>
                    <div className="text-sm text-muted-foreground">{word.kana}</div>
                    <div className="text-sm font-medium">{word.english}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={onRestart}
            className="w-full h-12 text-lg"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Play Again
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

