"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountTab } from "@/components/settings/account-tab"
import { WordFlashcardSettings } from "@/components/settings/word-flashcard-settings"
import { KanjiFlashcardSettings } from "@/components/settings/kanji-flashcard-settings"
import { GrammarQuizSettings } from "@/components/settings/grammar-quiz-settings"
import { WordBuilderSettings } from "@/components/settings/word-builder-settings"
import { User, Brain, Languages, CheckCircle, Puzzle } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences.</p>
      </div>

      <Card className="glass-card border-border/50 shadow-lg w-full max-w-6xl mx-auto">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl">Account & Study Preferences</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
              <TabsTrigger
                value="account"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Account</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="words"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span>Word Flashcards</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="kanji"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  <span>Kanji Flashcards</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="grammar"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Grammar Quiz</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="word-builder"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                <div className="flex items-center gap-2">
                  <Puzzle className="w-4 h-4" />
                  <span>Word Builder</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="account" className="mt-0">
                <AccountTab />
              </TabsContent>

              <TabsContent value="words" className="mt-0">
                <WordFlashcardSettings />
              </TabsContent>

              <TabsContent value="kanji" className="mt-0">
                <KanjiFlashcardSettings />
              </TabsContent>

              <TabsContent value="grammar" className="mt-0">
                <GrammarQuizSettings />
              </TabsContent>

              <TabsContent value="word-builder" className="mt-0">
                <WordBuilderSettings />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
