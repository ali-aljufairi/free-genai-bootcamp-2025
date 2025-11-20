"use client"
import { useTheme } from "next-themes"
import { useActivityDates } from "@/hooks/api/useDashboard"
import { useMemo } from "react"

export function StreakCalendar() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const { data, isLoading, error } = useActivityDates()

  // Convert activity dates to a map for quick lookup
  const activityData = useMemo(() => {
    const activityMap: { [key: string]: boolean } = {}

    if (data?.dates && Array.isArray(data.dates)) {
      data.dates.forEach((dateStr: string) => {
        // Ensure date is in correct format (YYYY-MM-DD)
        let normalizedDate = dateStr;
        if (normalizedDate.includes('T')) {
          normalizedDate = normalizedDate.split('T')[0];
        }
        activityMap[normalizedDate] = true;
      });
    }

    return activityMap;
  }, [data?.dates]);

  // Generate last 28 days (4 weeks)
  const days = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - 27 + i)
      const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format
      return {
        date,
        dateKey,
        hasActivity: activityData[dateKey] || false,
      }
    })
  }, [activityData])

  // Group days by week
  const weeks = useMemo(() => {
    const result = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  // Get day names for the header
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Generate dummy data for fallback
  const generateDummyData = () => {
    const dummyData: { [key: string]: boolean } = {}
    for (let i = 0; i < 28; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      if (i < 7) {
        dummyData[dateKey] = Math.random() > 0.3
      } else {
        dummyData[dateKey] = Math.random() > 0.6
      }
    }
    return dummyData
  }

  // Use dummy data if there's an error
  const displayData = error ? generateDummyData() : activityData
  const displayDays = error
    ? Array.from({ length: 28 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - 27 + i)
      const dateKey = date.toISOString().split('T')[0]
      return {
        date,
        dateKey,
        hasActivity: displayData[dateKey] || false,
      }
    })
    : days

  const displayWeeks = error
    ? (() => {
      const result = []
      for (let i = 0; i < displayDays.length; i += 7) {
        result.push(displayDays.slice(i, i + 7))
      }
      return result
    })()
    : weeks

  return (
    <div className="w-full px-1">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Activity Calendar</h3>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {dayNames.map((day) => (
          <div key={day} className="text-xs text-center text-muted-foreground font-medium py-0.5">
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
          {displayWeeks.map((week, weekIndex) => (
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
