"use client"

import { useEffect, useMemo, useState } from "react"
import { ListChecks, Loader2, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  useDailyMissionConfig,
  useDailyMissionToday,
  useUpdateDailyMissionConfig,
} from "@/hooks/api/useDashboard"
import { DailyMissionConfig, DailyMissionTargetMode } from "@/types/api"
import {
  GoalPlannerTable,
  PlannerTaskRow,
} from "@/components/dashboard/lab/goal-planner-table"
import { useDailyMissionLabEvents } from "@/components/dashboard/lab/use-lab-events"

function buildPlannerRows(config: DailyMissionConfig): PlannerTaskRow[] {
  const taskByActivity = new Map(config.tasks.map((task) => [task.activity_key, task]))
  const displayOrderByActivity = new Map(config.tasks.map((task, index) => [task.activity_key, index + 1]))

  return config.available_activities
    .map((option) => {
      const existing = taskByActivity.get(option.activity_key)
      if (existing) {
        return {
          activity_key: option.activity_key,
          title: option.title,
          description: option.description,
          target_mode: existing.target_mode,
          target_value: existing.target_value,
          is_active: true,
          display_order: displayOrderByActivity.get(option.activity_key) ?? 9999,
        }
      }
      return {
        activity_key: option.activity_key,
        title: option.title,
        description: option.description,
        target_mode: option.default_target_mode,
        target_value: option.default_target_value,
        is_active: false,
        display_order: 9999,
      }
    })
    .sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1
      }
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order
      }
      return a.title.localeCompare(b.title)
    })
}

export default function PlannerLabPage() {
  const { data: config, isLoading, error, refetch } = useDailyMissionConfig()
  const { data: today } = useDailyMissionToday()
  const updateConfigMutation = useUpdateDailyMissionConfig()
  const [rows, setRows] = useState<PlannerTaskRow[]>([])
  useDailyMissionLabEvents("planner", today)

  useEffect(() => {
    if (config) {
      setRows(buildPlannerRows(config))
    }
  }, [config])

  const activeRowsCount = useMemo(
    () => rows.filter((row) => row.is_active).length,
    [rows],
  )

  const onChangeRow = (activityKey: string, patch: Partial<PlannerTaskRow>) => {
    setRows((currentRows) => currentRows.map((row) => {
      if (row.activity_key !== activityKey) {
        return row
      }
      return {
        ...row,
        ...patch,
      }
    }))
  }

  const onResetBalancedTrio = () => {
    setRows((currentRows) => currentRows.map((row) => {
      if (row.activity_key === "kanji") {
        return { ...row, is_active: true, target_mode: "items", target_value: 10 }
      }
      if (row.activity_key === "vocabulary_review") {
        return { ...row, is_active: true, target_mode: "items", target_value: 20 }
      }
      if (row.activity_key === "speaking_conversation") {
        return { ...row, is_active: true, target_mode: "sessions", target_value: 1 }
      }
      return { ...row, is_active: false }
    }))
  }

  const onSave = async () => {
    const orderedRows = [...rows]
    let activeOrder = 1
    let inactiveOrder = 1000

    try {
      await updateConfigMutation.mutateAsync({
        active_variant: "planner",
        tasks: orderedRows.map((row) => {
          const nextOrder = row.is_active ? activeOrder++ : inactiveOrder++
          return {
            activity_key: row.activity_key,
            target_mode: row.target_mode as DailyMissionTargetMode,
            target_value: row.target_value,
            display_order: nextOrder,
            is_active: row.is_active,
          }
        }),
      })
      toast.success("Planner goals updated")
    } catch (mutationError) {
      toast.error("Couldn't save planner goals", {
        description: mutationError instanceof Error ? mutationError.message : "Unknown error",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !config) {
    return (
      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle>Planner Grid</CardTitle>
          <CardDescription>We couldn&apos;t load your planner settings.</CardDescription>
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
        <h1 className="text-3xl font-bold tracking-tight">Planner Grid Lab</h1>
        <p className="text-muted-foreground">
          Customize session and activity targets to match your daily motivation and available time.
        </p>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-indigo-400" />
              Daily Goal Planner
            </CardTitle>
            <Badge variant="outline">Active goals: {activeRowsCount}</Badge>
          </div>
          <CardDescription>
            Tune goal intensity per activity. Changes are saved to your mission config and reflected in today&apos;s view.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <section className="rounded-lg border border-border/70 bg-background/20 p-4">
            <p className="text-sm font-semibold">Today Snapshot</p>
            {today ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Completed {today.completed_tasks}/{today.total_tasks} tasks ({today.completion_percent}%).
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Today&apos;s mission snapshot is temporarily unavailable.
              </p>
            )}
          </section>

          <Separator />

          <GoalPlannerTable
            rows={rows}
            onChangeRow={onChangeRow}
            onSave={onSave}
            onResetBalancedTrio={onResetBalancedTrio}
            isSaving={updateConfigMutation.isPending}
          />

          <Separator />

          <section className="rounded-lg border border-border/70 bg-background/20 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-blue-400" />
              Planner Notes
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>Use lower targets on busy days to protect streak consistency.</li>
              <li>Use items for flashcard-heavy goals and sessions for conversation goals.</li>
              <li>Balanced Trio reset restores a simple default mission.</li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
