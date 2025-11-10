"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { GrammarQuestionType } from "@/types/api"

interface QuestionTypeSelectorProps {
    questionType: GrammarQuestionType
    onQuestionTypeChange: (type: GrammarQuestionType) => void
    isMobile?: boolean
}

export function QuestionTypeSelector({ questionType, onQuestionTypeChange, isMobile = false }: QuestionTypeSelectorProps) {
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
                            <p>Choose a specific grammar question type or "All Types" for mixed practice</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <Select value={questionType} onValueChange={(value) => onQuestionTypeChange(value as GrammarQuestionType)}>
                <SelectTrigger className={isMobile ? "h-12" : ""}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="grammar_choice">Grammar Choice</SelectItem>
                    <SelectItem value="passage_grammar">Passage Grammar</SelectItem>
                    <SelectItem value="sentence_composition">Sentence Composition</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

