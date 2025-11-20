"use client"

import { BookOpen, Brain, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useQuickStats } from "@/hooks/api/useDashboard"
import { useUserProfile } from "@/hooks/api/useGroup"

export function StatsCards() {
  const { data: stats, isLoading, error } = useQuickStats();
  const { data: userProfile } = useUserProfile();

  // Format JLPT level (1-5) to N5-N1 format
  const getJLPTLevel = (level: number | undefined): string => {
    if (!level) return "N5";
    const levelMap: Record<number, string> = {
      5: "N5",
      4: "N4",
      3: "N3",
      2: "N2",
      1: "N1",
    };
    return levelMap[level] || "N5";
  };

  // Access user profile data (backend returns UserProfile with user and settings)
  const userProfileData = userProfile as any;
  const jlptLevel = getJLPTLevel(userProfileData?.settings?.current_jlpt_level);
  const sessionsCompleted = stats?.total_sessions_completed ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/30">
              <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sessions Completed</p>
              <p className="text-2xl font-bold">{isLoading ? "Loading..." : sessionsCompleted}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Items in Review</p>
              <p className="text-2xl font-bold">{isLoading ? "Loading..." : stats?.items_in_review ?? 0}</p>
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
              <p className="text-sm font-medium text-muted-foreground">JLPT Level</p>
              <p className="text-2xl font-bold">{isLoading ? "Loading..." : jlptLevel}</p>
              {error && <p className="text-xs text-red-500 mt-1">Could not load data</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

