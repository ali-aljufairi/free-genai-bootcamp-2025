"use client"

import { useWordFlashcardStore } from "@/stores/word-flashcard-store"
import { useQuery } from "@tanstack/react-query"
import { flashcardsV2Api } from "@/services/api"
import { Settings } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { JLPTLevelSelector } from "@/components/study/configs/shared/jlpt-level-selector"
import { CardCountSelector } from "@/components/study/configs/shared/card-count-selector"
import { CourseUnitSelector } from "@/components/study/configs/shared/course-unit-selector"
import { SRSThresholdSelector } from "@/components/study/configs/shared/srs-threshold-selector"
import { TimerSelector } from "@/components/study/configs/shared/timer-selector"
import { DisplayOptions } from "@/components/study/configs/shared/display-options"
import { PartOfSpeechSelector } from "@/components/ui/part-of-speech-selector"
import { PARTS_OF_SPEECH } from "@/types/pos-enum"

export function WordFlashcardSettings() {
  const {
    level,
    selectedCourse,
    selectedUnit,
    count,
    selectedPartsOfSpeech,
    showKana,
    showKanji,
    showRomaji,
    showEnglish,
    askForKana,
    askForKanji,
    askForRomaji,
    askForEnglish,
    requiredCorrectCount,
    timerDuration,
    setLevel,
    setCourse,
    setUnit,
    setCount,
    setPartsOfSpeech,
    setShowOptions,
    setAskOptions,
    setRequiredCorrectCount,
    setTimerDuration,
  } = useWordFlashcardStore()

  // Fetch courses and units
  const { data: allCourses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: flashcardsV2Api.courses,
    staleTime: 5 * 60 * 1000,
  })

  const availableCourses = Array.isArray(allCourses)
    ? allCourses.filter(course => course.level === level)
    : []

  const { data: units = [] } = useQuery({
    queryKey: ['units', selectedCourse],
    queryFn: () => flashcardsV2Api.units(selectedCourse!),
    enabled: selectedCourse !== null,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="space-y-6">
      {/* Study Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-medium">Study Settings</h3>
            <p className="text-sm text-muted-foreground">Configure your word flashcard study preferences</p>
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
          <CourseUnitSelector
            selectedCourse={selectedCourse}
            selectedUnit={selectedUnit}
            availableCourses={availableCourses}
            units={units}
            onCourseChange={setCourse}
            onUnitChange={setUnit}
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

      {/* Part of Speech Filter */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-medium">Part of Speech Filter</h3>
            <p className="text-sm text-muted-foreground">Filter words by grammatical category</p>
          </div>
        </div>
        <PartOfSpeechSelector
          selectedParts={selectedPartsOfSpeech}
          onSelectionChange={setPartsOfSpeech}
          availableParts={PARTS_OF_SPEECH}
        />
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
        <DisplayOptions
          showOptions={{
            showKana,
            showKanji,
            showRomaji,
            showEnglish,
          }}
          askOptions={{
            askForKana,
            askForKanji,
            askForRomaji,
            askForEnglish,
          }}
          onShowOptionsChange={setShowOptions}
          onAskOptionsChange={setAskOptions}
          isMobile={false}
        />
      </div>
    </div>
  )
}

