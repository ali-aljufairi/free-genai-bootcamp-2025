"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ReadingQuestionType } from "@/types/api"

interface ReadingQuestionTypeSelectorProps {
    questionType: ReadingQuestionType
    onQuestionTypeChange: (type: ReadingQuestionType) => void
    isMobile?: boolean
}

export function ReadingQuestionTypeSelector({ questionType, onQuestionTypeChange, isMobile = false }: ReadingQuestionTypeSelectorProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1">
                <Label className="text-sm font-medium">Question Type</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Choose a specific reading question type or "All Types" for mixed practice</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <Select value={questionType} onValueChange={(value) => onQuestionTypeChange(value as ReadingQuestionType)}>
                <SelectTrigger className={isMobile ? "h-12" : ""}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="information_search">Information Search</SelectItem>
                    <SelectItem value="long_passage">Long Passage</SelectItem>
                    <SelectItem value="medium_passage">Medium Passage</SelectItem>
                    <SelectItem value="reading_comprehensive">Reading Comprehensive</SelectItem>
                    <SelectItem value="reading_topic">Reading Topic</SelectItem>
                    <SelectItem value="short_passage">Short Passage</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
