"use client"

import { Flame, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DailyMissionInsights } from "@/types/api"

interface InsightWidgetsProps {
  insights: DailyMissionInsights
}

function riskVariant(level: "low" | "medium" | "high"): "default" | "secondary" | "destructive" {
  if (level === "high") {
    return "destructive"
  }
  if (level === "medium") {
    return "secondary"
  }
  return "default"
}

export function InsightWidgets({ insights }: InsightWidgetsProps) {
  const maxTrend = Math.max(...insights.completion_trend.map((point) => point.completion_percent), 1)
  const maxMix = Math.max(...insights.activity_mix.map((point) => point.value), 1)

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold">Completion Trend (Last 7 Days)</h3>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {insights.completion_trend.map((point) => {
            const height = Math.max(8, Math.round((point.completion_percent / maxTrend) * 80))
            return (
              <div key={point.date} className="space-y-1 text-center">
                <div className="mx-auto flex h-24 w-8 items-end justify-center rounded-md border border-border/60 bg-background/30 p-1">
                  <div
                    className="w-full rounded-sm bg-blue-500/80"
                    style={{ height: `${height}%` }}
                    title={`${point.date}: ${point.completion_percent}%`}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{point.date.slice(5)}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Activity Mix</h3>
        {insights.activity_mix.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet in this insight window.</p>
        ) : (
          <div className="space-y-2">
            {insights.activity_mix.map((point) => {
              const width = Math.max(6, Math.round((point.value / maxMix) * 100))
              return (
                <div key={point.activity_key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{point.title}</span>
                    <span className="text-muted-foreground">{point.value}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-indigo-500/80" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-background/20 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="h-4 w-4 text-orange-400" />
            Streak Health
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Current streak: <span className="font-medium text-foreground">{insights.streak_health.current_streak_days} days</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Active days this week: <span className="font-medium text-foreground">{insights.streak_health.active_days_last_7}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            Momentum status: {insights.streak_health.status}
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-background/20 p-4">
          <p className="text-sm font-semibold">Burnout Risk</p>
          <div className="mt-2">
            <Badge variant={riskVariant(insights.burnout_risk.level)} className="capitalize">
              {insights.burnout_risk.level}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{insights.burnout_risk.reason}</p>
        </div>
      </section>
    </div>
  )
}

