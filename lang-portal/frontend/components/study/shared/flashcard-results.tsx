"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { FlashcardResult } from "@/types/api"

interface FlashcardResultsProps {
  results: FlashcardResult
  onStudyAgain: () => void
  onNewConfiguration: () => void
  isLoading: boolean
  isMobile: boolean
}

export function FlashcardResults({
  results,
  onStudyAgain,
  onNewConfiguration,
  isLoading,
  isMobile
}: FlashcardResultsProps) {
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <Card className="flex-1 glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm flex items-center justify-center">
        <CardContent className={`${isMobile ? "p-4" : "p-8"} w-full max-w-lg`}>
          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center mb-6">
              <h2 className={isMobile ? "text-2xl font-bold mb-3" : "text-4xl font-bold mb-4"}>
                Words Session Complete!
              </h2>
              <div>
                <p className={isMobile ? "text-xl font-semibold mb-1" : "text-3xl font-semibold mb-2"}>
                  Your Score: {results.correct_count}/{results.total}
                </p>
                <p className={isMobile ? "text-lg" : "text-2xl"} style={{ color: "var(--muted-foreground)" }}>
                  {Math.round(results.percentage)}% Correct
                </p>
              </div>
            </div>

            <div className="w-full space-y-4">
              <Button
                onClick={onStudyAgain}
                className={`w-full bg-blue-600 hover:bg-blue-700 ${isMobile ? "text-lg h-12" : "text-xl h-14"}`}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Study Again"}
              </Button>
              <Button
                onClick={onNewConfiguration}
                variant="outline"
                className={`w-full ${isMobile ? "text-lg h-12" : "text-xl h-14"}`}
              >
                New Configuration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
