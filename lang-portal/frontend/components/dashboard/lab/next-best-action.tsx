"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DailyMissionNextAction } from "@/types/api"

interface NextBestActionProps {
  action?: DailyMissionNextAction | null
  onStartAction: (action: DailyMissionNextAction) => void
}

export function NextBestAction({ action, onStartAction }: NextBestActionProps) {
  if (!action) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="text-sm font-semibold text-emerald-300">Mission complete for today.</p>
        <p className="mt-1 text-xs text-emerald-200/80">
          Nice consistency. Optional extra practice is always available from Study Hub.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/70 bg-background/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Next Best Action
          </p>
          <p className="mt-1 text-sm font-semibold">{action.title}</p>
        </div>
        <Button size="sm" onClick={() => onStartAction(action)}>
          Start Now
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

