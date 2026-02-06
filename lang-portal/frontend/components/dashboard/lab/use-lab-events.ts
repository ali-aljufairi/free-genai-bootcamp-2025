"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useLogDailyMissionEvent } from "@/hooks/api/useDashboard"
import { DailyMissionTask, DailyMissionToday } from "@/types/api"

const LAST_VISIT_STORAGE_KEY = "daily_mission_lab_last_visit"
const MISSION_COMPLETE_STORAGE_KEY = "daily_mission_lab_completed_date"

function localDateLabel(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function dayDiff(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00`)
  const to = new Date(`${toDate}T00:00:00`)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

export function useDailyMissionLabEvents(variant: string, today?: DailyMissionToday) {
  const pathname = usePathname()
  const logEvent = useLogDailyMissionEvent()
  const hasOpenedRef = useRef(false)
  const completionSentForDateRef = useRef<string>("")

  useEffect(() => {
    if (hasOpenedRef.current) {
      return
    }
    hasOpenedRef.current = true

    logEvent.mutate({
      activity_key: "dashboard_lab",
      event_type: "variant_opened",
      metadata: {
        variant,
        pathname,
      },
    })

    const todayLabel = localDateLabel()
    const lastVisit = window.localStorage.getItem(LAST_VISIT_STORAGE_KEY)
    if (lastVisit && dayDiff(lastVisit, todayLabel) === 1) {
      logEvent.mutate({
        activity_key: "dashboard_lab",
        event_type: "return_next_day",
        metadata: {
          variant,
          previous_date: lastVisit,
          current_date: todayLabel,
        },
      })
    }
    window.localStorage.setItem(LAST_VISIT_STORAGE_KEY, todayLabel)
  }, [logEvent, pathname, variant])

  useEffect(() => {
    if (!today || today.completion_percent < 100) {
      return
    }
    if (completionSentForDateRef.current === today.date) {
      return
    }

    const completedDate = window.localStorage.getItem(MISSION_COMPLETE_STORAGE_KEY)
    if (completedDate === today.date) {
      completionSentForDateRef.current = today.date
      return
    }

    logEvent.mutate({
      activity_key: "dashboard_lab",
      event_type: "mission_completed",
      value: today.completed_tasks,
      metadata: {
        variant,
        date: today.date,
        completed_tasks: today.completed_tasks,
        total_tasks: today.total_tasks,
      },
    })

    window.localStorage.setItem(MISSION_COMPLETE_STORAGE_KEY, today.date)
    completionSentForDateRef.current = today.date
  }, [logEvent, today, variant])

  const logTaskStarted = useCallback((task: DailyMissionTask) => {
    logEvent.mutate({
      activity_key: task.activity_key,
      event_type: "task_started",
      metadata: {
        variant,
        task_id: task.id,
        target_mode: task.target_mode,
        target_value: task.target_value,
      },
    })
  }, [logEvent, variant])

  return {
    logTaskStarted,
  }
}
