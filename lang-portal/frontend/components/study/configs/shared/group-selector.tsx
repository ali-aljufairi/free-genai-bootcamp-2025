"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Group {
    id: number | string
    name: string
    description?: string | null
}

interface GroupSelectorProps {
    selectedGroup: number | null
    groups: Group[]
    onGroupChange: (groupId: number | null) => void
    isMobile?: boolean
}

export function GroupSelector({
    selectedGroup,
    groups,
    onGroupChange,
    isMobile = false
}: GroupSelectorProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1">
                <Label className="text-sm font-medium">Group (Optional)</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Choose a specific kanji group or use all kanji for mixed practice</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <Select
                value={selectedGroup?.toString() || "all"}
                onValueChange={(value) => {
                    if (value === "all") {
                        onGroupChange(null)
                    } else {
                        const groupId = typeof value === "string" ? parseInt(value, 10) : value
                        onGroupChange(isNaN(groupId) ? null : groupId)
                    }
                }}
            >
                <SelectTrigger className={isMobile ? "h-12" : ""}>
                    <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((group) => (
                        <SelectItem key={group.id} value={String(group.id)}>
                            {group.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

