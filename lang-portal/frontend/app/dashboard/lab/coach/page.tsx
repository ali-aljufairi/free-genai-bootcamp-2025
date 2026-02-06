"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, BrainCircuit, Loader2, MessageSquareQuote } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { MissionTaskList } from "@/components/dashboard/lab/mission-task-list"
import { resolveStudyRoute } from "@/components/dashboard/lab/lab-utils"
import { useDailyMissionLabEvents } from "@/components/dashboard/lab/use-lab-events"
import { useDailyMissionInsights, useDailyMissionToday } from "@/hooks/api/useDashboard"
import { DailyMissionTask } from "@/types/api"

function buildCoachMessage(completionPercent: number, streakDays: number): string {
  if (completionPercent >= 100) {
    return "You completed your mission. Keep one optional short session to reinforce momentum."
  }
  if (completionPercent >= 60) {
    return "You are close. One focused session will likely close today cleanly."
  }
  if (streakDays >= 3) {
    return "Protect your streak first. Prioritize one quick win before adding harder tasks."
  }
  return "Start with the smallest task to create momentum, then chain into the next one."
}

export default function CoachPanelLabPage() {
  const router = useRouter()
  const { data: today, isLoading, error, refetch } = useDailyMissionToday()
  const { data: insights } = useDailyMissionInsights()
  const [startingTaskKey, setStartingTaskKey] = useState<string | null>(null)
  const { logTaskStarted } = useDailyMissionLabEvents("coach", today)

  const firstIncomplete = useMemo(() => {
    if (!today) {
      return null
    }
    return today.tasks.find((task) => !task.completed) ?? null
  }, [today])

  const coachMessage = useMemo(() => {
    if (!today) {
      return ""
    }
    return buildCoachMessage(today.completion_percent, today.streak_days)
  }, [today])

  const startTask = (task: DailyMissionTask) => {
    logTaskStarted(task)
    setStartingTaskKey(task.activity_key)
    router.push(resolveStudyRoute(task.start_type, task.cta_path))
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !today) {
    return (
      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle>Coach Panel</CardTitle>
          <CardDescription>We couldn&apos;t load your coach panel right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()}>Try again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Coach Panel Lab</h1>
        <p className="text-muted-foreground">
          A guided dashboard that explains your status and gives a concrete daily playbook.
        </p>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-blue-400" />
              Daily Coach
            </CardTitle>
            <Badge variant="outline">{today.completion_percent}% complete</Badge>
          </div>
          <CardDescription>
            Turn daily data into motivation and a specific action sequence.
          </CardDescription>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Mission progress</span>
              <span>{today.completed_tasks}/{today.total_tasks} tasks</span>
            </div>
            <Progress value={today.completion_percent} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareQuote className="h-4 w-4 text-emerald-400" />
                Coach Diagnosis
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{coachMessage}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="text-sm font-semibold">Consistency Signals</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Streak: <span className="font-medium text-foreground">{today.streak_days} days</span>
              </p>
              {insights && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Active days (7d): <span className="font-medium text-foreground">{insights.streak_health.active_days_last_7}</span>
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Burnout risk: <span className="font-medium text-foreground">{insights.burnout_risk.level}</span>
                  </p>
                </>
              )}
            </div>
          </section>

          <Separator />

          <section className="rounded-lg border border-border/70 bg-background/20 p-4">
            <p className="text-sm font-semibold">Today&apos;s Playbook</p>
            {firstIncomplete ? (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  1) Start with <span className="font-medium text-foreground">{firstIncomplete.title}</span>.
                </p>
                <p className="text-xs text-muted-foreground">
                  2) After that, complete one more short task to lock consistency.
                </p>
                <p className="text-xs text-muted-foreground">
                  3) If energy drops, do one 5-minute review and end positive.
                </p>
                <Button className="mt-3" size="sm" onClick={() => startTask(firstIncomplete)}>
                  Start {firstIncomplete.title}
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Mission is complete. Add a short optional practice from Study Hub to extend fluency.
              </p>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Mission Checklist</h3>
            <MissionTaskList
              tasks={today.tasks}
              onStartTask={startTask}
              startingTaskKey={startingTaskKey}
            />
          </section>

          <Separator />

          <section className="rounded-lg border border-border/70 bg-background/20 p-4">
            <p className="text-sm font-semibold">Alternative Views</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/lab/action">
                  Open Action Board
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/lab/analytics">
                  Open Analytics View
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

