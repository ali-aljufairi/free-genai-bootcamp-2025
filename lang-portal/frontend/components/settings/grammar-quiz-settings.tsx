"use client"

import { useGrammarStore } from "@/stores/grammar-store"
import { Settings } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { JLPTLevelSelector } from "@/components/study/configs/shared/jlpt-level-selector"
import { CardCountSelector } from "@/components/study/configs/shared/card-count-selector"
import { QuestionTypeSelector } from "@/components/study/configs/shared/question-type-selector"
import { SRSThresholdSelector } from "@/components/study/configs/shared/srs-threshold-selector"
import { TimerSelector } from "@/components/study/configs/shared/timer-selector"

export function GrammarQuizSettings() {
  const {
    level,
    questionType,
    useSRS,
    count,
    requiredCorrectCount,
    timerDuration,
    setLevel,
    setQuestionType,
    setUseSRS,
    setCount,
    setRequiredCorrectCount,
    setTimerDuration,
  } = useGrammarStore()

  return (
    <div className="space-y-6">
      {/* Study Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-medium">Study Settings</h3>
            <p className="text-sm text-muted-foreground">Configure your grammar quiz preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuestionTypeSelector
            questionType={questionType}
            onQuestionTypeChange={setQuestionType}
            isMobile={false}
          />
          <JLPTLevelSelector
            level={level}
            onLevelChange={setLevel}
            isMobile={false}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardCountSelector
            count={count}
            onCountChange={setCount}
            isMobile={false}
          />
          <SRSThresholdSelector
            requiredCorrectCount={requiredCorrectCount}
            onThresholdChange={setRequiredCorrectCount}
            isMobile={false}
          />
          <TimerSelector
            timerDuration={timerDuration}
            onTimerChange={setTimerDuration}
            isMobile={false}
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* SRS Mode */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-medium">SRS Mode</h3>
            <p className="text-sm text-muted-foreground">Control spaced repetition system behavior</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Use SRS Filter</Label>
              <p className="text-sm text-muted-foreground">
                Only show questions that need review based on your progress
              </p>
            </div>
            <Switch
              checked={useSRS}
              onCheckedChange={setUseSRS}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

