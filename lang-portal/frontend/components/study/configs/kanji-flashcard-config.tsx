"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Play } from "lucide-react"
import { JLPTLevelSelector } from "./shared/jlpt-level-selector"
import { CardCountSelector } from "./shared/card-count-selector"
import { GroupSelector } from "./shared/group-selector"
import { SRSThresholdSelector } from "./shared/srs-threshold-selector"
import { TimerSelector } from "./shared/timer-selector"
import { KanjiDisplayOptions } from "./shared/kanji-display-options"

interface FlashcardPreferences {
    level: number
    selectedGroup: number | null
    count: number
    showCharacter: boolean
    showOnyomi: boolean
    showKunyomi: boolean
    showKanjiEnglish: boolean
    askForCharacter: boolean
    askForOnyomi: boolean
    askForKunyomi: boolean
    askForKanjiEnglish: boolean
    requiredCorrectCount: number
    timerDuration: number
}

interface Group {
    id: number | string
    name: string
    description?: string | null
}

interface KanjiFlashcardConfigProps {
    preferences: FlashcardPreferences
    groups: Group[]
    onLevelChange: (level: number) => void
    onGroupChange: (groupId: number | null) => void
    onCountChange: (count: number) => void
    onShowOptionsChange: (options: Partial<Pick<FlashcardPreferences, 'showCharacter' | 'showOnyomi' | 'showKunyomi' | 'showKanjiEnglish'>>) => void
    onAskOptionsChange: (options: Partial<Pick<FlashcardPreferences, 'askForCharacter' | 'askForOnyomi' | 'askForKunyomi' | 'askForKanjiEnglish'>>) => void
    onThresholdChange: (count: number) => void
    onTimerChange: (duration: number) => void
    onStart: () => void
    isLoading: boolean
    isMobile: boolean
}

export function KanjiFlashcardConfig({
    preferences,
    groups,
    onLevelChange,
    onGroupChange,
    onCountChange,
    onShowOptionsChange,
    onAskOptionsChange,
    onThresholdChange,
    onTimerChange,
    onStart,
    isLoading,
    isMobile
}: KanjiFlashcardConfigProps) {
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

                {/* Group Selection */}
                <Card className="glass-card mb-4">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Settings className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">Group Selection</h3>
                            <span className="text-xs text-muted-foreground ml-auto">Optional</span>
                        </div>

                        <GroupSelector
                            selectedGroup={preferences.selectedGroup}
                            groups={groups}
                            onGroupChange={onGroupChange}
                            isMobile={true}
                        />
                    </CardContent>
                </Card>

                {/* Display Options */}
                <Card className="glass-card mb-4">
                    <CardContent className="p-4 space-y-4">
                        <KanjiDisplayOptions
                            showOptions={{
                                showCharacter: preferences.showCharacter,
                                showOnyomi: preferences.showOnyomi,
                                showKunyomi: preferences.showKunyomi,
                                showKanjiEnglish: preferences.showKanjiEnglish
                            }}
                            askOptions={{
                                askForCharacter: preferences.askForCharacter,
                                askForOnyomi: preferences.askForOnyomi,
                                askForKunyomi: preferences.askForKunyomi,
                                askForKanjiEnglish: preferences.askForKanjiEnglish
                            }}
                            onShowOptionsChange={onShowOptionsChange}
                            onAskOptionsChange={onAskOptionsChange}
                            isMobile={true}
                        />
                    </CardContent>
                </Card>

                {/* Timer */}
                <Card className="glass-card mb-4">
                    <CardContent className="p-4 space-y-4">
                        <TimerSelector
                            timerDuration={preferences.timerDuration}
                            onTimerChange={onTimerChange}
                            isMobile={true}
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
                        {isLoading ? "Loading..." : "Start Kanji Study"}
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
                            <SRSThresholdSelector
                                requiredCorrectCount={preferences.requiredCorrectCount}
                                onThresholdChange={onThresholdChange}
                                isMobile={false}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <GroupSelector
                                selectedGroup={preferences.selectedGroup}
                                groups={groups}
                                onGroupChange={onGroupChange}
                                isMobile={false}
                            />
                            <TimerSelector
                                timerDuration={preferences.timerDuration}
                                onTimerChange={onTimerChange}
                                isMobile={false}
                            />
                        </div>
                    </div>

                    {/* Display Options */}
                    <KanjiDisplayOptions
                        showOptions={{
                            showCharacter: preferences.showCharacter,
                            showOnyomi: preferences.showOnyomi,
                            showKunyomi: preferences.showKunyomi,
                            showKanjiEnglish: preferences.showKanjiEnglish
                        }}
                        askOptions={{
                            askForCharacter: preferences.askForCharacter,
                            askForOnyomi: preferences.askForOnyomi,
                            askForKunyomi: preferences.askForKunyomi,
                            askForKanjiEnglish: preferences.askForKanjiEnglish
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
                            {isLoading ? "Loading..." : "Start Kanji Study"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

