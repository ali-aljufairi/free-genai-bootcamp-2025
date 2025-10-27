"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface JLPTLevelSelectorProps {
    level: number
    onLevelChange: (level: number) => void
    isMobile?: boolean
}

export function JLPTLevelSelector({ level, onLevelChange, isMobile = false }: JLPTLevelSelectorProps) {
    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">JLPT Level</Label>
            <Select value={level.toString()} onValueChange={(value) => onLevelChange(parseInt(value))}>
                <SelectTrigger className={isMobile ? "h-12" : ""}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="5">N5 (Beginner)</SelectItem>
                    <SelectItem value="4">N4</SelectItem>
                    <SelectItem value="3">N3</SelectItem>
                    <SelectItem value="2">N2</SelectItem>
                    <SelectItem value="1">N1 (Advanced)</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
