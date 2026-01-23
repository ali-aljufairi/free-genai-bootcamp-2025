"use client"

import { useEffect } from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountTab } from "@/components/settings/account-tab"
import { UserSettingsTab } from "@/components/settings/user-settings-tab"
import { WordFlashcardSettings } from "@/components/settings/word-flashcard-settings"
import { KanjiFlashcardSettings } from "@/components/settings/kanji-flashcard-settings"
import { GrammarQuizSettings } from "@/components/settings/grammar-quiz-settings"
import { WordBuilderSettings } from "@/components/settings/word-builder-settings"
import { User, Brain, Languages, CheckCircle, Puzzle, Settings, Loader2 } from "lucide-react"
import { useIsMobile } from "@/components/ui/use-mobile"
import { MobileSettingsPage } from "@/components/settings/mobile/mobile-settings-page"
import { useSubscription } from "@/components/subscription/subscription-gate"

export default function SettingsPage() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { isLoaded, hasActiveSubscription } = useSubscription()

  // Redirect non-subscribed users to pricing page
  useEffect(() => {
    if (isLoaded && !hasActiveSubscription) {
      startTransition(() => {
        router.push('/pricing')
      })
    }
  }, [isLoaded, hasActiveSubscription, router, startTransition])

  // Show loading state during SSR/hydration to prevent hydration mismatch
  if (isMobile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Use separate mobile component for better maintainability
  if (isMobile) {
    return <MobileSettingsPage />
  }

  // Desktop layout
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
                value="user-settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>User Settings</span>
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

              <TabsContent value="user-settings" className="mt-0">
                <UserSettingsTab />
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
