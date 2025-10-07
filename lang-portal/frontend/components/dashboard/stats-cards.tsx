"use client"

import { BookOpen, Brain, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
// import { useQuickStats } from "@/hooks/api/useDashboard"

export function StatsCards() {
  // const { data: stats, isLoading, error } = useQuickStats();

  // // Default values for stats if loading or error
  // const wordsLearned = stats?.wordsLearned ?? 247;
  // const studyTime = stats?.studyTime ?? "12.5 hrs";
  // const masteryLevel = stats?.masteryLevel ?? "Intermediate";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Words Learned</p>
              {/* <p className="text-2xl font-bold">{isLoading ? "Loading..." : wordsLearned}</p> */}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Study Time</p>
              {/* <p className="text-2xl font-bold">{isLoading ? "Loading..." : studyTime}</p> */}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/30">
              <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Mastery Level</p>
              {/* <p className="text-2xl font-bold">{isLoading ? "Loading..." : masteryLevel}</p> */}
              {/* {error && <p className="text-xs text-red-500 mt-1">Could not load data</p>} */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

