"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { WordBuilderValidWord } from "@/types/api"

interface WordBuilderFormedWordsProps {
  words: WordBuilderValidWord[]
}

export function WordBuilderFormedWords({ words }: WordBuilderFormedWordsProps) {
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
                className="p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{word.kanji}</div>
                    <div className="text-sm text-muted-foreground">{word.kana}</div>
                  </div>
                  <div className="text-sm font-medium">{word.english}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

