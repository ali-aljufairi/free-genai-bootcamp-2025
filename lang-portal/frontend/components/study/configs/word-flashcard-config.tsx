"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Play } from "lucide-react"
import { JLPTLevelSelector } from "./shared/jlpt-level-selector"
import { CardCountSelector } from "./shared/card-count-selector"
import { CourseUnitSelector } from "./shared/course-unit-selector"
import { SRSThresholdSelector } from "./shared/srs-threshold-selector"
import { DisplayOptions } from "./shared/display-options"
import { PartOfSpeechSelector } from "@/components/ui/part-of-speech-selector"
import { PartOfSpeech, PARTS_OF_SPEECH } from "@/types/pos-enum"
import type { Course, Unit } from "@/types/api"

interface FlashcardPreferences {
    level: number
    selectedCourse: number | null
    selectedUnit: number | null
    count: number
    selectedPartsOfSpeech: PartOfSpeech[]
    showKana: boolean
    showKanji: boolean
    showRomaji: boolean
    showEnglish: boolean
    askForKana: boolean
    askForKanji: boolean
    askForRomaji: boolean
    askForEnglish: boolean
    requiredCorrectCount: number
}

interface WordFlashcardConfigProps {
    preferences: FlashcardPreferences
    courses: Course[]
    units: Unit[]
    onLevelChange: (level: number) => void
    onCourseChange: (courseId: number | null) => void
    onUnitChange: (unitId: number | null) => void
    onCountChange: (count: number) => void
    onPartsOfSpeechChange: (parts: PartOfSpeech[]) => void
    onShowOptionsChange: (options: Partial<Pick<FlashcardPreferences, 'showKana' | 'showKanji' | 'showRomaji' | 'showEnglish'>>) => void
    onAskOptionsChange: (options: Partial<Pick<FlashcardPreferences, 'askForKana' | 'askForKanji' | 'askForRomaji' | 'askForEnglish'>>) => void
    onThresholdChange: (count: number) => void
    onStart: () => void
    isLoading: boolean
    isMobile: boolean
}

export function WordFlashcardConfig({
    preferences,
    courses,
    units,
    onLevelChange,
    onCourseChange,
    onUnitChange,
    onCountChange,
    onPartsOfSpeechChange,
    onShowOptionsChange,
    onAskOptionsChange,
    onThresholdChange,
    onStart,
    isLoading,
    isMobile
}: WordFlashcardConfigProps) {
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
                            <SRSThresholdSelector
                                requiredCorrectCount={preferences.requiredCorrectCount}
                                onThresholdChange={onThresholdChange}
                                isMobile={true}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Course & Unit */}
                <Card className="glass-card mb-4">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Settings className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">Course Selection</h3>
                            <span className="text-xs text-muted-foreground ml-auto">Optional</span>
                        </div>

                        <CourseUnitSelector
                            selectedCourse={preferences.selectedCourse}
                            selectedUnit={preferences.selectedUnit}
                            availableCourses={courses}
                            units={units}
                            onCourseChange={onCourseChange}
                            onUnitChange={onUnitChange}
                            isMobile={true}
                        />
                    </CardContent>
                </Card>

                {/* Display Options */}
                <Card className="glass-card mb-4">
                    <CardContent className="p-4 space-y-4">
                        <DisplayOptions
                            showOptions={{
                                showKana: preferences.showKana,
                                showKanji: preferences.showKanji,
                                showRomaji: preferences.showRomaji,
                                showEnglish: preferences.showEnglish
                            }}
                            askOptions={{
                                askForKana: preferences.askForKana,
                                askForKanji: preferences.askForKanji,
                                askForRomaji: preferences.askForRomaji,
                                askForEnglish: preferences.askForEnglish
                            }}
                            onShowOptionsChange={onShowOptionsChange}
                            onAskOptionsChange={onAskOptionsChange}
                            isMobile={true}
                        />
                    </CardContent>
                </Card>

                {/* Part of Speech Filter */}
                <Card className="glass-card mb-4">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Settings className="w-5 h-5 text-green-500" />
                            <div className="flex-1">
                                <h3 className="font-semibold">Part of Speech</h3>
                                <p className="text-xs text-muted-foreground">Filter by category</p>
                            </div>
                        </div>

                        <PartOfSpeechSelector
                            selectedParts={preferences.selectedPartsOfSpeech}
                            availableParts={PARTS_OF_SPEECH}
                            onSelectionChange={onPartsOfSpeechChange}
                        />
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
                        {isLoading ? "Loading..." : "Start Word Study"}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <CourseUnitSelector
                                selectedCourse={preferences.selectedCourse}
                                selectedUnit={preferences.selectedUnit}
                                availableCourses={courses}
                                units={units}
                                onCourseChange={onCourseChange}
                                onUnitChange={onUnitChange}
                                isMobile={false}
                            />
                            <SRSThresholdSelector
                                requiredCorrectCount={preferences.requiredCorrectCount}
                                onThresholdChange={onThresholdChange}
                                isMobile={false}
                            />
                        </div>
                    </div>

                    {/* Part of Speech Filter */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-2">
                            <Settings className="w-6 h-6 text-green-500" />
                            <div>
                                <h3 className="text-lg font-medium">Part of Speech Filter</h3>
                                <p className="text-sm text-muted-foreground">Filter words by grammatical category.</p>
                            </div>
                        </div>

                        <PartOfSpeechSelector
                            selectedParts={preferences.selectedPartsOfSpeech}
                            availableParts={PARTS_OF_SPEECH}
                            onSelectionChange={onPartsOfSpeechChange}
                        />
                    </div>

                    {/* Display Options */}
                    <DisplayOptions
                        showOptions={{
                            showKana: preferences.showKana,
                            showKanji: preferences.showKanji,
                            showRomaji: preferences.showRomaji,
                            showEnglish: preferences.showEnglish
                        }}
                        askOptions={{
                            askForKana: preferences.askForKana,
                            askForKanji: preferences.askForKanji,
                            askForRomaji: preferences.askForRomaji,
                            askForEnglish: preferences.askForEnglish
                        }}
                        onShowOptionsChange={onShowOptionsChange}
                        onAskOptionsChange={onAskOptionsChange}
                        isMobile={false}
                    />

                    {/* Start Button */}
                    <div className="pt-4 border-t border-border/50">
                        <Button
                            onClick={onStart}
                            className="w-full h-12 text-lg font-medium"
                            disabled={isLoading}
                        >
                            <Play className="w-5 h-5 mr-2" />
                            {isLoading ? "Loading..." : "Start Word Study"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
