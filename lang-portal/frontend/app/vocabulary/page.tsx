import { Suspense } from "react"
import { VocabularyBrowser } from "@/components/vocabulary/vocabulary-browser"
import { Loader2 } from "lucide-react"

function VocabularyBrowserFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function VocabularyPage() {
  return (
    <div className="space-y-6">
      <div className="hidden md:flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Vocabulary Browser</h1>
        <p className="text-muted-foreground">Browse, search and study your vocabulary cards.</p>
      </div>

      <Suspense fallback={<VocabularyBrowserFallback />}>
        <VocabularyBrowser />
      </Suspense>
    </div>
  )
}

