"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Clock3, ListTodo, Loader2, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { MissionTaskList } from "@/components/dashboard/lab/mission-task-list"
import { NextBestAction } from "@/components/dashboard/lab/next-best-action"
import { resolveStudyRoute } from "@/components/dashboard/lab/lab-utils"
import { useDailyMissionLabEvents } from "@/components/dashboard/lab/use-lab-events"
import { useDailyMissionInsights, useDailyMissionToday } from "@/hooks/api/useDashboard"
import { DailyMissionNextAction, DailyMissionTask } from "@/types/api"

function estimateMinutes(task: DailyMissionTask): number {
  if (task.target_mode === "sessions") {
    return Math.max(5, task.target_value * 12)
  }
  return Math.max(5, Math.round(task.target_value * 1.5))
}

export default function ActionBoardLabPage() {
  const router = useRouter()
  const { data: today, isLoading, error, refetch } = useDailyMissionToday()
  const { data: insights } = useDailyMissionInsights()
  const [startingTaskKey, setStartingTaskKey] = useState<string | null>(null)
  const { logTaskStarted } = useDailyMissionLabEvents("action", today)

  const pendingTasks = useMemo(() => {
    if (!today) {
      return []
    }
    return today.tasks.filter((task) => !task.completed)
  }, [today])

  const estimatedRemainingMinutes = useMemo(() => {
    return pendingTasks.reduce((sum, task) => sum + estimateMinutes(task), 0)
  }, [pendingTasks])

  const startTask = (task: DailyMissionTask) => {
    logTaskStarted(task)
    setStartingTaskKey(task.activity_key)
    router.push(resolveStudyRoute(task.start_type, task.cta_path))
  }

  const startAction = (action: DailyMissionNextAction) => {
    const matchingTask = today?.tasks.find((task) => task.activity_key === action.activity_key)
    if (matchingTask) {
      logTaskStarted(matchingTask)
    }
    setStartingTaskKey(action.activity_key)
    router.push(resolveStudyRoute(action.start_type, action.cta_path))
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
          <CardTitle>Action Board</CardTitle>
          <CardDescription>We couldn&apos;t load your action board right now.</CardDescription>
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
        <h1 className="text-3xl font-bold tracking-tight">Action Board Lab</h1>
        <p className="text-muted-foreground">
          A fast, action-heavy dashboard where every section leads directly to a study step.
        </p>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-blue-400" />
              Daily Action Board
            </CardTitle>
            <Badge variant="outline">{today.completed_tasks}/{today.total_tasks} complete</Badge>
          </div>
          <CardDescription>
            Focus on immediate execution: do the next right thing, then keep momentum with fallback actions.
          </CardDescription>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Mission progress</span>
              <span>{today.completion_percent}%</span>
            </div>
            <Progress value={today.completion_percent} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-background/20 p-4 md:col-span-2">
              <NextBestAction action={today.next_recommended_action} onStartAction={startAction} />
            </div>
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 className="h-4 w-4 text-indigo-400" />
                Remaining Load
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimated time to finish today:
              </p>
              <p className="mt-2 text-2xl font-semibold">{estimatedRemainingMinutes} min</p>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Action Queue</h3>
            <MissionTaskList
              tasks={today.tasks}
              onStartTask={startTask}
              startingTaskKey={startingTaskKey}
            />
          </section>

          <Separator />

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Action Alternatives
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                If you feel stuck, open one of these:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/lab/mission">
                    Mission View
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/lab/planner">
                    Planner
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/study">
                    Study Hub
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="text-sm font-semibold">Load Signal</p>
              {insights ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    Burnout risk: <span className="font-medium text-foreground">{insights.burnout_risk.level}</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{insights.burnout_risk.reason}</p>
                </>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Insight data is not available yet.</p>
              )}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

