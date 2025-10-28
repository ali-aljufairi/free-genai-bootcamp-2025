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
  isSubmitting?: boolean
}

export function FlashcardResults({
  results,
  onStudyAgain,
  onNewConfiguration,
  isLoading,
  isMobile,
  isSubmitting = false
}: FlashcardResultsProps) {
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <Card className="flex-1 glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm flex items-center justify-center">
        <CardContent className={`${isMobile ? "p-6" : "p-12"} w-full max-w-2xl`}>
          <div className="flex flex-col items-center justify-center space-y-12">
            <div className="text-center">
              <h2 className={isMobile ? "text-3xl font-bold mb-4" : "text-5xl font-bold mb-6"}>
                Words Session Complete!
              </h2>
              <div className="space-y-2">
                <p className={isMobile ? "text-2xl font-semibold" : "text-4xl font-semibold"}>
                  Your Score: {results.correct_count}/{results.total}
                </p>
                <p className={isMobile ? "text-xl" : "text-3xl"} style={{ color: "var(--muted-foreground)" }}>
                  {Math.round(results.percentage)}% Correct
                </p>
                {isSubmitting && (
                  <p className={isMobile ? "text-sm" : "text-base"} style={{ color: "var(--muted-foreground)" }}>
                    Saving results...
                  </p>
                )}
              </div>
            </div>

            <div className={`w-full ${isMobile ? "space-y-4" : "flex gap-6"}`}>
              <Button
                onClick={onStudyAgain}
                className={`${isMobile ? "w-full" : "flex-1"} bg-blue-600 hover:bg-blue-700 ${isMobile ? "text-lg h-12" : "text-xl h-16"}`}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Study Again"}
              </Button>
              <Button
                onClick={onNewConfiguration}
                variant="outline"
                className={`${isMobile ? "w-full" : "flex-1"} ${isMobile ? "text-lg h-12" : "text-xl h-16"}`}
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
