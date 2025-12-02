"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { WordBuilderValidWord } from "@/types/api"
import { useWordBuilderStore } from "@/stores/word-builder-store"

interface WordBuilderFormedWordsProps {
  words: WordBuilderValidWord[]
}

export function WordBuilderFormedWords({ words }: WordBuilderFormedWordsProps) {
  const { removeFormedWord } = useWordBuilderStore()

  if (words.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Formed Words</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No words formed yet. Drag kanji to build words!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Formed Words ({words.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {words.map((word, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{word.kanji}</div>
                    <div className="text-sm text-muted-foreground">{word.kana}</div>
                    <div className="text-sm font-medium mt-1">{word.english}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2 shrink-0"
                    onClick={() => removeFormedWord(index)}
                    title="Delete word"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

