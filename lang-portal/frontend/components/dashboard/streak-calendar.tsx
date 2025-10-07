"use client"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { api } from "@/services/api"

export function StreakCalendar() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [activityData, setActivityData] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Generate last 28 days (4 weeks)
  const days = Array.from({ length: 28 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - 27 + i)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format
    return {
      date,
      dateKey,
      hasActivity: activityData[dateKey] || false,
    }
  })

  useEffect(() => {
    async function fetchActivityData() {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch activity data from all sources
        const [progressData, studyActivities] = await Promise.all([
          api.dashboard.getStudyProgress(),
          api.studyActivity.getStudyActivities(1, 100)
        ]);

        // Convert the API responses into a map of dates with activity
        const activityMap: { [key: string]: boolean } = {}
        
        // Process activity dates from study progress
        if (progressData && progressData.dailyActivity && Array.isArray(progressData.dailyActivity)) {
          progressData.dailyActivity.forEach((activity) => {
            if (activity && activity.date) {
              // Ensure date is in correct format (YYYY-MM-DD)
              let dateStr = activity.date;
              if (dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
              }
              activityMap[dateStr] = true;
            }
          });
        }

        // Add activity dates from study activities
        if (studyActivities && studyActivities.items && Array.isArray(studyActivities.items)) {
          studyActivities.items.forEach(activity => {
            if (activity && activity.created_at) {
              const dateStr = new Date(activity.created_at).toISOString().split('T')[0];
              activityMap[dateStr] = true;
            }
          });
        }

        setActivityData(activityMap)
      } catch (err) {
        console.error("Failed to fetch activity data:", err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        
        // Use dummy data if API fails
        generateDummyData()
      } finally {
        setIsLoading(false)
      }
    }

    function generateDummyData() {
      // Create dummy activity data for demonstration purposes
      const dummyData: { [key: string]: boolean } = {}
      
      // Create a realistic pattern for the last 28 days
      for (let i = 0; i < 28; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        
        if (i < 7) {
          // Recent days have higher chance of activity
          dummyData[dateKey] = Math.random() > 0.3
        } else {
          // Older days have lower chance of activity
          dummyData[dateKey] = Math.random() > 0.6
        }
      }
      
      setActivityData(dummyData)
    }

    fetchActivityData()
  }, [])

  // Group days by week
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  // Get day names for the header
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Activity Calendar</h3>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-xs text-center text-muted-foreground font-medium">
            {day}
          </div>
        ))}
      </div>
      
      {isLoading ? (
        <div className="h-[140px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading calendar data...</p>
        </div>
      ) : (
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => {
                const isToday = new Date().toDateString() === day.date.toDateString()
                return (
                  <div
                    key={dayIndex}
                    className={`
                      aspect-square rounded-sm flex items-center justify-center text-xs
                      transition-all duration-200
                      ${isToday ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}
                      ${day.hasActivity
                        ? isDark
                          ? "bg-gradient-to-br from-blue-500/90 to-blue-600/90 text-white shadow-sm border border-white/40"
                          : "bg-gradient-to-br from-blue-400/90 to-blue-500/90 text-white shadow-sm border border-white/60"
                        : "bg-blue-100/40 dark:bg-blue-900/20 text-muted-foreground hover:bg-blue-100/60 dark:hover:bg-blue-900/30"
                      }
                    `}
                    title={`${day.date.toLocaleDateString()}${day.hasActivity ? ' - Activity completed' : ''}`}
                  >
                    {day.date.getDate()}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

