"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Play } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { JLPTLevelSelector } from "./shared/jlpt-level-selector"
import { CardCountSelector } from "./shared/card-count-selector"
import { SRSThresholdSelector } from "./shared/srs-threshold-selector"
import { TimerSelector } from "./shared/timer-selector"
import { QuestionTypeSelector } from "./shared/question-type-selector"
import type { GrammarQuestionType } from "@/types/api"

interface GrammarPreferences {
    level: number
    questionType: GrammarQuestionType
    useSRS: boolean
    count: number
    requiredCorrectCount: number
    timerDuration: number
}

interface GrammarQuizConfigProps {
    preferences: GrammarPreferences
    onLevelChange: (level: number) => void
    onQuestionTypeChange: (type: GrammarQuestionType) => void
    onUseSRSChange: (useSRS: boolean) => void
    onCountChange: (count: number) => void
    onThresholdChange: (count: number) => void
    onTimerChange: (duration: number) => void
    onStart: () => void
    isLoading: boolean
    isMobile: boolean
}

export function GrammarQuizConfig({
    preferences,
    onLevelChange,
    onQuestionTypeChange,
    onUseSRSChange,
    onCountChange,
    onThresholdChange,
    onTimerChange,
    onStart,
    isLoading,
    isMobile
}: GrammarQuizConfigProps) {
    if (isMobile) {
        return (
            <div className="pb-20">
                {/* Quick Settings Card */}
                <Card className="glass-card mb-4">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Settings className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">Quick Start</h3>
                        </div>

                        <div className="space-y-4">
                            <QuestionTypeSelector
                                questionType={preferences.questionType}
                                onQuestionTypeChange={onQuestionTypeChange}
                                isMobile={true}
                            />
                            <JLPTLevelSelector
                                level={preferences.level}
                                onLevelChange={onLevelChange}
                                isMobile={true}
                            />
                            <CardCountSelector
                                count={preferences.count}
                                onCountChange={onCountChange}
                                isMobile={true}
                            />
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">SRS Mode</Label>
                                    <Switch
                                        checked={preferences.useSRS}
                                        onCheckedChange={onUseSRSChange}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Only show questions that need review
                                </p>
                            </div>
                            <SRSThresholdSelector
                                requiredCorrectCount={preferences.requiredCorrectCount}
                                onThresholdChange={onThresholdChange}
                                isMobile={true}
                            />
                            <TimerSelector
                                timerDuration={preferences.timerDuration}
                                onTimerChange={onTimerChange}
                                isMobile={true}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Start Button */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t">
                    <Button
                        onClick={onStart}
                        className="w-full h-14 text-lg font-medium"
                        disabled={isLoading}
                    >
                        <Play className="w-5 h-5 mr-2" />
                        {isLoading ? "Loading..." : "Start Grammar Quiz"}
                    </Button>
                </div>
            </div>
        )
    }

    // Desktop layout
    return (
        <div className="h-full min-h-screen flex flex-col">
            <Card className="glass-card flex-1 m-4">
                <CardContent className="p-8 space-y-8 h-full flex flex-col">
                    {/* Study Settings */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                            <Settings className="w-6 h-6" />
                            <h3 className="text-lg font-medium">Study Settings</h3>
                            <p className="text-sm text-muted-foreground">Choose your level and session size.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <QuestionTypeSelector
                                questionType={preferences.questionType}
                                onQuestionTypeChange={onQuestionTypeChange}
                                isMobile={false}
                            />
                            <JLPTLevelSelector
                                level={preferences.level}
                                onLevelChange={onLevelChange}
                                isMobile={false}
                            />
                            <CardCountSelector
                                count={preferences.count}
                                onCountChange={onCountChange}
                                isMobile={false}
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">SRS Mode</Label>
                                    <Switch
                                        checked={preferences.useSRS}
                                        onCheckedChange={onUseSRSChange}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Only show questions that need review
                                </p>
                            </div>
                            <SRSThresholdSelector
                                requiredCorrectCount={preferences.requiredCorrectCount}
                                onThresholdChange={onThresholdChange}
                                isMobile={false}
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                            <TimerSelector
                                timerDuration={preferences.timerDuration}
                                onTimerChange={onTimerChange}
                                isMobile={false}
                            />
                        </div>
                    </div>

                    {/* Start Button */}
                    <div className="pt-4 border-t border-border/50">
                        <Button
                            onClick={onStart}
                            className="w-full h-12 text-lg font-medium"
                            disabled={isLoading}
                        >
                            <Play className="w-5 h-5 mr-2" />
                            {isLoading ? "Loading..." : "Start Grammar Quiz"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

