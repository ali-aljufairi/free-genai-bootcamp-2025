"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Brain, Languages, CheckCircle, Puzzle, Settings, ChevronRight } from "lucide-react"
import { AccountTab } from "@/components/settings/account-tab"
import { UserSettingsTab } from "@/components/settings/user-settings-tab"
import { WordFlashcardSettings } from "@/components/settings/word-flashcard-settings"
import { KanjiFlashcardSettings } from "@/components/settings/kanji-flashcard-settings"
import { GrammarQuizSettings } from "@/components/settings/grammar-quiz-settings"
import { WordBuilderSettings } from "@/components/settings/word-builder-settings"

type SettingsSection = 
  | "account" 
  | "user-settings" 
  | "words" 
  | "kanji" 
  | "grammar" 
  | "word-builder"
  | null

const settingsSections = [
  {
    id: "account" as const,
    title: "Account",
    description: "Manage your profile and account settings",
    icon: User,
  },
  {
    id: "user-settings" as const,
    title: "User Settings",
    description: "Study preferences and localization",
    icon: Settings,
  },
  {
    id: "words" as const,
    title: "Word Flashcards",
    description: "Configure word flashcard preferences",
    icon: Brain,
  },
  {
    id: "kanji" as const,
    title: "Kanji Flashcards",
    description: "Configure kanji flashcard preferences",
    icon: Languages,
  },
  {
    id: "grammar" as const,
    title: "Grammar Quiz",
    description: "Configure grammar quiz preferences",
    icon: CheckCircle,
  },
  {
    id: "word-builder" as const,
    title: "Word Builder",
    description: "Configure word builder preferences",
    icon: Puzzle,
  },
]

export function MobileSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>(null)

  if (activeSection) {
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveSection(null)}
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Button>
          <h2 className="text-xl font-semibold">
            {settingsSections.find(s => s.id === activeSection)?.title}
          </h2>
        </div>

        {/* Content */}
        <div className="px-4 pb-safe pb-4">
          <Card className="glass-card border-border/50 shadow-lg">
            <CardContent className="p-4">
              {activeSection === "account" && <AccountTab />}
              {activeSection === "user-settings" && <UserSettingsTab />}
              {activeSection === "words" && <WordFlashcardSettings />}
              {activeSection === "kanji" && <KanjiFlashcardSettings />}
              {activeSection === "grammar" && <GrammarQuizSettings />}
              {activeSection === "word-builder" && <WordBuilderSettings />}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>

      {/* Settings Sections List */}
      <div className="px-4 space-y-3 pb-safe pb-4">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Card
              key={section.id}
              className="glass-card border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
              onClick={() => setActiveSection(section.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{section.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

