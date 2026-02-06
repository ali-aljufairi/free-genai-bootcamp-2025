"use client"

import Link from "next/link"
import { ArrowRight, FlaskConical, LayoutDashboard, LineChart, Settings2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useDailyMissionConfig, useDailyMissionToday } from "@/hooks/api/useDashboard"

const variantLabels: Record<string, string> = {
  mission: "Mission-First",
  planner: "Planner Grid",
  analytics: "Analytics-First",
}

export default function DashboardLabSwitcherPage() {
  const { data: config } = useDailyMissionConfig()
  const { data: today } = useDailyMissionToday()

  const activeVariantLabel = config ? variantLabels[config.active_variant] : "Not set"

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Lab</h1>
        <p className="text-muted-foreground">
          Compare three learner-first daily mission experiences before replacing the default dashboard.
        </p>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-400" />
            Daily Mission UX Lab
          </CardTitle>
          <CardDescription>
            Test each route, then keep the one that feels most motivating for your daily Japanese routine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current selected variant:</span>
            <Badge variant="outline">{activeVariantLabel}</Badge>
            {today && (
              <Badge variant="secondary">
                Today: {today.completed_tasks}/{today.total_tasks} tasks ({today.completion_percent}%)
              </Badge>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <LayoutDashboard className="h-4 w-4 text-blue-400" />
                Mission-First
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Three clear tasks, quick start CTAs, and immediate "what to do next" guidance.
              </p>
              <Button className="mt-3" size="sm" asChild>
                <Link href="/dashboard/lab/mission">
                  Open Mission Variant
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Settings2 className="h-4 w-4 text-indigo-400" />
                Planner Grid
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tune activity-specific goals by sessions/items and control total daily load.
              </p>
              <Button className="mt-3" size="sm" asChild>
                <Link href="/dashboard/lab/planner">
                  Open Planner Variant
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <LineChart className="h-4 w-4 text-emerald-400" />
                Analytics-First
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prioritizes completion trends, activity mix, and streak stability while keeping today&apos;s mission visible.
              </p>
              <Button className="mt-3" size="sm" asChild>
                <Link href="/dashboard/lab/analytics">
                  Open Analytics Variant
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
