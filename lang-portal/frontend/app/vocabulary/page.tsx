"use client"

import { VocabularyBrowser } from "@/components/vocabulary/vocabulary-browser"

export default function VocabularyPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Vocabulary Browser</h1>
        <p className="text-muted-foreground">Browse, search and study your vocabulary cards.</p>
      </div>

      <VocabularyBrowser />
    </div>
  )
}

