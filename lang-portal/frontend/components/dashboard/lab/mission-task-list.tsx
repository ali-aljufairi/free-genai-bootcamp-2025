"use client"

import { ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DailyMissionTask } from "@/types/api"
import { isWeakTelemetryActivity, sortTasksByCompletion } from "@/components/dashboard/lab/lab-utils"

interface MissionTaskListProps {
  tasks: DailyMissionTask[]
  onStartTask: (task: DailyMissionTask) => void
  startingTaskKey?: string | null
}

function modeLabel(mode: string): string {
  return mode === "items" ? "Items" : "Sessions"
}

export function MissionTaskList({
  tasks,
  onStartTask,
  startingTaskKey,
}: MissionTaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-6 text-center">
        <p className="text-sm font-medium">No active tasks in today&apos;s mission.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Open the planner variant to add or enable activities.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortTasksByCompletion(tasks).map((task) => {
        const progressValue = task.target_value > 0
          ? Math.min(100, Math.round((task.current_value / task.target_value) * 100))
          : 0

        return (
          <div
            key={task.id}
            className="rounded-lg border border-border/70 bg-background/20 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="text-sm font-semibold">{task.title}</h3>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {modeLabel(task.target_mode)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                {isWeakTelemetryActivity(task.activity_key) && (
                  <p className="mt-1 text-xs text-amber-500">
                    Progress is auto-logged when this flow is completed.
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant={task.completed ? "outline" : "default"}
                onClick={() => onStartTask(task)}
                disabled={startingTaskKey === task.activity_key}
              >
                {startingTaskKey === task.activity_key ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Opening
                  </>
                ) : task.completed ? (
                  <>
                    Practice More
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Start
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{task.current_value} / {task.target_value}</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

