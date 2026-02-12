"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressCircle } from "@/components/dashboard/progress-circle"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { StreakCalendar } from "@/components/dashboard/streak-calendar"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

import { BookOpen, Clock, TrendingUp } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { useStudyProgress, useQuickStats } from "@/hooks/api/useDashboard"
import { useUserProfile } from "@/hooks/api/useGroup"

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: studyProgress } = useStudyProgress();
  const { data: quickStats } = useQuickStats();
  const { data: userProfile } = useUserProfile();

  // Show loading skeleton while authentication is initializing
  if (!isLoaded) {
    return <DashboardSkeleton />;
  }

  // Safety check: redirect should happen via middleware, but adding extra safety
  if (!isSignedIn) {
    return null;
  }

  // Calculate progress value from study progress
  const progressValue =
    studyProgress?.total_available_words && studyProgress.total_available_words > 0
      ? Math.min(
          Math.round(((studyProgress.total_words_studied || 0) / studyProgress.total_available_words) * 100),
          100
        )
      : 0;

  // Get streak days from quick stats
  const streakDays = quickStats?.study_streak_days || 0;

  // Get username from user profile
  const username = userProfile?.user?.display_name
    ? userProfile.user.display_name
    : userProfile?.user?.email
      ? userProfile.user.email.split("@")[0]
      : "Learner";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {username}</h1>
        <p className="text-muted-foreground">Track your progress and continue your language learning journey.</p>
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
          <CardContent className="h-[260px] overflow-auto py-0">
            <ActivityFeed />
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/study">View All Activity</Link>
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
          <CardContent className="py-3">
            <StreakCalendar />
          </CardContent>
          <CardFooter className="pt-2">
            <p className="text-sm text-muted-foreground w-full text-center">
              Current streak: <span className="font-medium text-blue-600 dark:text-blue-400">{streakDays} days</span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
