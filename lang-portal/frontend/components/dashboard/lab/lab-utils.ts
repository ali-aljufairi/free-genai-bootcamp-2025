"use client"

import { DailyMissionTask } from "@/types/api"

const sessionBasedStartTypes = new Set([
  "chat",
  "drawing",
  "agent",
  "speech",
  "companion-study",
])

const staticStudyRoutes = new Set([
  "words",
  "kanji",
  "grammar",
  "reading",
  "word-builder",
])

export function createSessionId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function resolveStudyRoute(startType: string, fallbackPath: string): string {
  if (sessionBasedStartTypes.has(startType)) {
    return `/study/${startType}/${createSessionId(startType)}`
  }

  if (staticStudyRoutes.has(startType)) {
    return `/study/${startType}`
  }

  if (fallbackPath.startsWith("/study/")) {
    return fallbackPath
  }

  return "/study"
}

export function isWeakTelemetryActivity(activityKey: string): boolean {
  return activityKey === "writing" || activityKey === "learning_resources"
}

export function sortTasksByCompletion(tasks: DailyMissionTask[]): DailyMissionTask[] {
  return [...tasks].sort((a, b) => {
    if (a.completed === b.completed) {
      return a.id - b.id
    }
    return a.completed ? 1 : -1
  })
}

