"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DailyMissionTargetMode } from "@/types/api"

export interface PlannerTaskRow {
  activity_key: string
  title: string
  description: string
  target_mode: DailyMissionTargetMode
  target_value: number
  is_active: boolean
  display_order: number
}

interface GoalPlannerTableProps {
  rows: PlannerTaskRow[]
  onChangeRow: (activityKey: string, patch: Partial<PlannerTaskRow>) => void
  onSave: () => void
  onResetBalancedTrio: () => void
  isSaving: boolean
}

function clampTarget(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.min(200, Math.max(1, Math.round(value)))
}

export function GoalPlannerTable({
  rows,
  onChangeRow,
  onSave,
  onResetBalancedTrio,
  isSaving,
}: GoalPlannerTableProps) {
  const activeRows = rows.filter((row) => row.is_active)
  const totalLoad = activeRows.reduce((sum, row) => sum + row.target_value, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/20 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Daily Goal Planner</p>
          <p className="text-xs text-muted-foreground">
            Active goals: {activeRows.length} | Total daily load: {totalLoad}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onResetBalancedTrio} disabled={isSaving}>
            Reset Balanced Trio
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Goals"}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead className="w-[120px]">Include</TableHead>
            <TableHead className="w-[160px]">Target Mode</TableHead>
            <TableHead className="w-[140px]">Target Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.activity_key}>
              <TableCell>
                <div>
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(checked) => onChangeRow(row.activity_key, { is_active: checked })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {row.is_active ? "On" : "Off"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={row.target_mode}
                  onValueChange={(value) => onChangeRow(row.activity_key, { target_mode: value as DailyMissionTargetMode })}
                  disabled={!row.is_active}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sessions">Sessions</SelectItem>
                    <SelectItem value="items">Items</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={row.target_value}
                  disabled={!row.is_active}
                  className="h-8"
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10)
                    if (Number.isNaN(value)) {
                      return
                    }
                    onChangeRow(row.activity_key, { target_value: clampTarget(value) })
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

