"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Clock, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TimerSelectorProps {
  timerDuration: number
  onTimerChange: (duration: number) => void
  isMobile?: boolean
}

export function TimerSelector({ 
  timerDuration, 
  onTimerChange, 
  isMobile = false 
}: TimerSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label className="text-sm font-medium">Timer</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Auto-advance to next card if no answer is selected</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Select 
        value={timerDuration.toString()} 
        onValueChange={(value) => onTimerChange(parseInt(value))}
      >
        <SelectTrigger className={isMobile ? "h-12" : ""}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Off
            </div>
          </SelectItem>
          <SelectItem value="10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              10 seconds
            </div>
          </SelectItem>
          <SelectItem value="15">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              15 seconds
            </div>
          </SelectItem>
          <SelectItem value="20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              20 seconds
            </div>
          </SelectItem>
          <SelectItem value="30">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              30 seconds
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
