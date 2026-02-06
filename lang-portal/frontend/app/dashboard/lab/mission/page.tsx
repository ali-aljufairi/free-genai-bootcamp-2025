"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Compass, Flame, Loader2, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  useDailyMissionInsights,
  useDailyMissionToday,
} from "@/hooks/api/useDashboard"
import { MissionTaskList } from "@/components/dashboard/lab/mission-task-list"
import { NextBestAction } from "@/components/dashboard/lab/next-best-action"
import { resolveStudyRoute } from "@/components/dashboard/lab/lab-utils"
import { useDailyMissionLabEvents } from "@/components/dashboard/lab/use-lab-events"
import { DailyMissionNextAction, DailyMissionTask } from "@/types/api"

export default function MissionLabPage() {
  const router = useRouter()
  const { data: today, isLoading, error, refetch } = useDailyMissionToday()
  const { data: insights } = useDailyMissionInsights()
  const [startingTaskKey, setStartingTaskKey] = useState<string | null>(null)
  const { logTaskStarted } = useDailyMissionLabEvents("mission", today)

  const completedTitles = useMemo(() => {
    if (!today) {
      return []
    }
    return today.tasks.filter((task) => task.completed).map((task) => task.title)
  }, [today])

  const pendingCount = useMemo(() => {
    if (!today) {
      return 0
    }
    return today.tasks.filter((task) => !task.completed).length
  }, [today])

  const handleStartTask = (task: DailyMissionTask) => {
    logTaskStarted(task)
    setStartingTaskKey(task.activity_key)
    router.push(resolveStudyRoute(task.start_type, task.cta_path))
  }

  const handleStartAction = (action: DailyMissionNextAction) => {
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
          <CardTitle>Today&apos;s Mission</CardTitle>
          <CardDescription>We couldn&apos;t load your mission right now.</CardDescription>
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
        <h1 className="text-3xl font-bold tracking-tight">Mission-First Lab</h1>
        <p className="text-muted-foreground">
          A small-win daily mission that answers "what should I do next?" in one glance.
        </p>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-400" />
              Today&apos;s Mission
            </CardTitle>
            <Badge variant="outline">
              {today.completed_tasks}/{today.total_tasks} tasks done
            </Badge>
          </div>
          <CardDescription>
            Build consistency with three meaningful habits: kanji, vocabulary, and speaking.
          </CardDescription>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Mission completion</span>
              <span>{today.completion_percent}%</span>
            </div>
            <Progress value={today.completion_percent} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="text-xs text-muted-foreground">Focus Now</p>
              <p className="mt-1 text-sm font-semibold">{pendingCount} task(s) remaining</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="text-xs text-muted-foreground">Streak</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                {today.streak_days} day momentum
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="text-xs text-muted-foreground">Fast Nav</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/lab/planner">Planner</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/lab/analytics">Insights</Link>
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          <NextBestAction action={today.next_recommended_action} onStartAction={handleStartAction} />

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Task List</h3>
            <MissionTaskList
              tasks={today.tasks}
              onStartTask={handleStartTask}
              startingTaskKey={startingTaskKey}
            />
          </section>

          <Separator />

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="text-sm font-semibold">Streak Health</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Current streak: <span className="font-medium text-foreground">{today.streak_days} days</span>
              </p>
              {insights && (
                <p className="text-xs text-muted-foreground">
                  Active days this week: <span className="font-medium text-foreground">{insights.streak_health.active_days_last_7}</span>
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Compass className="h-4 w-4 text-emerald-400" />
                Recent Wins
              </p>
              {completedTitles.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {completedTitles.slice(0, 3).map((title) => (
                    <li key={title} className="text-xs text-muted-foreground">
                      Completed: <span className="font-medium text-foreground">{title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Finish your first mission task to start building daily wins.
                </p>
              )}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
