"use client"

import { useKanjiFlashcardStore } from "@/stores/kanji-flashcard-store"
import { useGroups } from "@/hooks/api/useGroup"
import { Settings } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { JLPTLevelSelector } from "@/components/study/configs/shared/jlpt-level-selector"
import { CardCountSelector } from "@/components/study/configs/shared/card-count-selector"
import { GroupSelector } from "@/components/study/configs/shared/group-selector"
import { SRSThresholdSelector } from "@/components/study/configs/shared/srs-threshold-selector"
import { TimerSelector } from "@/components/study/configs/shared/timer-selector"
import { KanjiDisplayOptions } from "@/components/study/configs/shared/kanji-display-options"

export function KanjiFlashcardSettings() {
  const {
    level,
    selectedGroup,
    count,
    showCharacter,
    showOnyomi,
    showKunyomi,
    showKanjiEnglish,
    askForCharacter,
    askForOnyomi,
    askForKunyomi,
    askForKanjiEnglish,
    requiredCorrectCount,
    timerDuration,
    setLevel,
    setGroup,
    setCount,
    setKanjiShowOptions,
    setKanjiAskOptions,
    setRequiredCorrectCount,
    setTimerDuration,
  } = useKanjiFlashcardStore()

  const { data: groups = [] } = useGroups()

  return (
    <div className="space-y-6">
      {/* Study Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-medium">Study Settings</h3>
            <p className="text-sm text-muted-foreground">Configure your kanji flashcard study preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <JLPTLevelSelector
            level={level}
            onLevelChange={setLevel}
            isMobile={false}
          />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GroupSelector
            selectedGroup={selectedGroup}
            groups={groups}
            onGroupChange={setGroup}
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

      {/* Display and Ask Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-medium">Card Display & Quiz Options</h3>
            <p className="text-sm text-muted-foreground">Configure what to show and what to ask</p>
          </div>
        </div>
        <KanjiDisplayOptions
          showOptions={{
            showCharacter,
            showOnyomi,
            showKunyomi,
            showKanjiEnglish,
          }}
          askOptions={{
            askForCharacter,
            askForOnyomi,
            askForKunyomi,
            askForKanjiEnglish,
          }}
          onShowOptionsChange={setKanjiShowOptions}
          onAskOptionsChange={setKanjiAskOptions}
          isMobile={false}
        />
      </div>
    </div>
  )
}

