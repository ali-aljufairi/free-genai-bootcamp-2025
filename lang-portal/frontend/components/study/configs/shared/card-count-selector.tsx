"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CardCountSelectorProps {
    count: number
    onCountChange: (count: number) => void
    isMobile?: boolean
}

export function CardCountSelector({ count, onCountChange, isMobile = false }: CardCountSelectorProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1">
                <Label className="text-sm font-medium">Number of Cards</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>How many flashcards to practice in this session</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <Select value={count.toString()} onValueChange={(value) => onCountChange(parseInt(value))}>
                <SelectTrigger className={isMobile ? "h-12" : ""}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="5">5 cards</SelectItem>
                    <SelectItem value="10">10 cards</SelectItem>
                    <SelectItem value="15">15 cards</SelectItem>
                    <SelectItem value="20">20 cards</SelectItem>
                    <SelectItem value="25">25 cards</SelectItem>
                    <SelectItem value="30">30 cards</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
