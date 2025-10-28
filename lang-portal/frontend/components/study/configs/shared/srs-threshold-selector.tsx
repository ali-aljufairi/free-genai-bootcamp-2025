"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SRSThresholdSelectorProps {
  requiredCorrectCount: number
  onThresholdChange: (count: number) => void
  isMobile?: boolean
}

export function SRSThresholdSelector({ 
  requiredCorrectCount, 
  onThresholdChange, 
  isMobile = false 
}: SRSThresholdSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label className="text-sm font-medium">Mastery Goal</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>How many times you need to answer correctly to master a word</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Select 
        value={requiredCorrectCount.toString()} 
        onValueChange={(value) => onThresholdChange(parseInt(value))}
      >
        <SelectTrigger className={isMobile ? "h-12" : ""}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Master after 1 correct</SelectItem>
          <SelectItem value="2">Master after 2 correct</SelectItem>
          <SelectItem value="3">Master after 3 correct (default)</SelectItem>
          <SelectItem value="4">Master after 4 correct</SelectItem>
          <SelectItem value="5">Master after 5 correct</SelectItem>
          <SelectItem value="6">Master after 6 correct</SelectItem>
          <SelectItem value="7">Master after 7 correct</SelectItem>
          <SelectItem value="8">Master after 8 correct</SelectItem>
          <SelectItem value="9">Master after 9 correct</SelectItem>
          <SelectItem value="10">Master after 10 correct</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
