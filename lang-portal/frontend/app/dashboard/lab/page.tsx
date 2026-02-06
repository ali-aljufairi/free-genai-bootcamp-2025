"use client"

import Link from "next/link"
import {
  ArrowRight,
  BrainCircuit,
  FlaskConical,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Settings2,
} from "lucide-react"
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

const labRoutes = [
  {
    key: "mission",
    title: "Mission-First",
    href: "/dashboard/lab/mission",
    description: "Clear mission tasks, fast start actions, and immediate next-step guidance.",
    icon: LayoutDashboard,
    isPersisted: true,
  },
  {
    key: "planner",
    title: "Planner Grid",
    href: "/dashboard/lab/planner",
    description: "Tune goal load by activity using sessions/items and preserve daily balance.",
    icon: Settings2,
    isPersisted: true,
  },
  {
    key: "analytics",
    title: "Analytics-First",
    href: "/dashboard/lab/analytics",
    description: "Start with trend signals, then convert insight into immediate actions.",
    icon: LineChart,
    isPersisted: true,
  },
  {
    key: "action",
    title: "Action Board",
    href: "/dashboard/lab/action",
    description: "A dense action console focused on quick execution and fallback moves.",
    icon: ListTodo,
    isPersisted: false,
  },
  {
    key: "coach",
    title: "Coach Panel",
    href: "/dashboard/lab/coach",
    description: "A motivational planning assistant with a daily diagnosis and playbook.",
    icon: BrainCircuit,
    isPersisted: false,
  },
]

export default function DashboardLabSwitcherPage() {
  const { data: config } = useDailyMissionConfig()
  const { data: today } = useDailyMissionToday()

  const activeVariantLabel = config ? variantLabels[config.active_variant] : "Not set"

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Lab</h1>
        <p className="text-muted-foreground">
          Compare five learner-first daily dashboard experiences and choose what feels most motivating.
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
            <Badge variant="secondary">3 persisted + 2 experimental routes</Badge>
            {today && (
              <Badge variant="secondary">
                Today: {today.completed_tasks}/{today.total_tasks} tasks ({today.completion_percent}%)
              </Badge>
            )}
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-2">
            {labRoutes.map((route) => (
              <div key={route.key} className="rounded-lg border border-border/70 bg-background/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <route.icon className="h-4 w-4 text-blue-400" />
                    {route.title}
                  </p>
                  {!route.isPersisted && <Badge variant="outline">Experimental</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{route.description}</p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href={route.href}>
                    Open {route.title}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
