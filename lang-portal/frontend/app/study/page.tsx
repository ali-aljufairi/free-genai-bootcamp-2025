"use client"

import type { Metadata } from "next"
import { StudySessionHub } from "@/components/study-session/study-session-hub"
import { usePreserveScrollPosition } from "@/hooks/use-preserve-state"

// Note: Metadata export needs to be moved to layout.tsx for client components
// export const metadata: Metadata = {
//   title: "Study | Sorami (空見)",
//   description: "Start a study session",
// }

export default function StudyPage() {
  // Preserve scroll position when navigating away and back
  const containerRef = usePreserveScrollPosition('study-hub')

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Study Session Hub</h1>
        <p className="text-muted-foreground">Choose an activity and start learning.</p>
      </div>

      <StudySessionHub />
    </div>
  )
}

