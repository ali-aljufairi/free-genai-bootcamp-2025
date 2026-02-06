"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  useDailyMissionInsights,
  useDailyMissionToday,
} from "@/hooks/api/useDashboard"
import { MissionTaskList } from "@/components/dashboard/lab/mission-task-list"
import { InsightWidgets } from "@/components/dashboard/lab/insight-widgets"
import { resolveStudyRoute } from "@/components/dashboard/lab/lab-utils"
import { useDailyMissionLabEvents } from "@/components/dashboard/lab/use-lab-events"
import { DailyMissionTask } from "@/types/api"

export default function AnalyticsLabPage() {
  const router = useRouter()
  const {
    data: today,
    isLoading: todayLoading,
    error: todayError,
    refetch: refetchToday,
  } = useDailyMissionToday()
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useDailyMissionInsights()
  const [startingTaskKey, setStartingTaskKey] = useState<string | null>(null)
  const { logTaskStarted } = useDailyMissionLabEvents("analytics", today)

  const handleStartTask = (task: DailyMissionTask) => {
    logTaskStarted(task)
    setStartingTaskKey(task.activity_key)
    router.push(resolveStudyRoute(task.start_type, task.cta_path))
  }

  if (todayLoading || insightsLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (todayError || insightsError || !today || !insights) {
    return (
      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle>Analytics-First</CardTitle>
          <CardDescription>We couldn&apos;t load mission insights right now.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => refetchToday()}>Retry Mission</Button>
          <Button variant="outline" onClick={() => refetchInsights()}>Retry Insights</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Analytics-First Lab</h1>
        <p className="text-muted-foreground">
          Start with trends and balance signals, then act on today&apos;s mission.
        </p>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              Mission Insights
            </CardTitle>
            <Badge variant="outline">
              Today: {today.completed_tasks}/{today.total_tasks} ({today.completion_percent}%)
            </Badge>
          </div>
          <CardDescription>
            Monitor consistency, workload, and activity balance to avoid burnout and keep momentum.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <InsightWidgets insights={insights} />

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Today&apos;s Mission (Quick Start)</h3>
            <MissionTaskList
              tasks={today.tasks}
              onStartTask={handleStartTask}
              startingTaskKey={startingTaskKey}
            />
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

