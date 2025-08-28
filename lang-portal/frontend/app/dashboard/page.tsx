"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressCircle } from "@/components/progress-circle"
// import { ActivityFeed } from "@/components/activity-feed"
// import { StreakCalendar } from "@/components/streak-calendar"
import { StatsCards } from "@/components/stats-cards"

import { BookOpen, Clock, TrendingUp } from "lucide-react"
// import { useLastStudySession, useStudyProgress } from "@/hooks/api/useDashboard"
import { useState, useEffect } from "react"


export default function Dashboard() {
  // const { data: lastSession } = useLastStudySession();
  // const { data: studyProgress, isLoading: progressLoading } = useStudyProgress();

  const [progressValue, setProgressValue] = useState<number>(65);
  const [streakDays, setStreakDays] = useState<number>(7);
  const [username, setUsername] = useState<string>("Learner");

  useEffect(() => {
    // TEMPORARILY DISABLED DUE TO DATABASE MIGRATION ISSUES
    // Update progress value if we have real data
    // if (studyProgress && studyProgress.dailyProgress) {
    //   setProgressValue(studyProgress.dailyProgress);
    // }

    // Update streak count if we have real data
    // if (studyProgress && studyProgress.currentStreak) {
    //   setStreakDays(studyProgress.currentStreak);
    // }

    // Could be expanded to fetch user profile data
    // For now using a default value
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {username}</h1>
        <p className="text-muted-foreground">Track your progress and continue your language learning journey.</p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            ⚠️ Some features are temporarily disabled due to database migration. Only Word Flashcards and Kanji Cards are available.
          </p>
        </div>
      </div>



      <StatsCards />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Daily Progress
            </CardTitle>
            <CardDescription>Your learning activity today</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <ProgressCircle value={progressValue} size={180} />
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/study">Continue Learning</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card className="col-span-1 glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest learning sessions</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] overflow-auto py-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Activity tracking temporarily disabled</p>
              <p className="text-xs mt-1">Due to database migration</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              View All Activity
            </Button>
          </CardFooter>
        </Card>
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Learning Streak
            </CardTitle>
            <CardDescription>Stay consistent with your learning</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[200px]">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Streak tracking temporarily disabled</p>
              <p className="text-xs mt-1">Due to database migration</p>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground w-full text-center">
              Current streak: <span className="font-medium text-blue-600 dark:text-blue-400">{streakDays} days</span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

