"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

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
      <Label className="text-sm font-medium">Correct Thereshold</Label>
      <Select 
        value={requiredCorrectCount.toString()} 
        onValueChange={(value) => onThresholdChange(parseInt(value))}
      >
        <SelectTrigger className={isMobile ? "h-12" : ""}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1 correct</SelectItem>
          <SelectItem value="2">2 correct</SelectItem>
          <SelectItem value="3">3 correct (default)</SelectItem>
          <SelectItem value="4">4 correct</SelectItem>
          <SelectItem value="5">5 correct</SelectItem>
          <SelectItem value="6">6 correct</SelectItem>
          <SelectItem value="7">7 correct</SelectItem>
          <SelectItem value="8">8 correct</SelectItem>
          <SelectItem value="9">9 correct</SelectItem>
          <SelectItem value="10">10 correct</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
