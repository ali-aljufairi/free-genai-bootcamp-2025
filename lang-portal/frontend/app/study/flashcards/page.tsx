"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Languages } from "lucide-react"
import { SubscriptionGate } from "@/components/subscription/subscription-gate"

export default function FlashcardsPage() {
    return (
        <SubscriptionGate feature="Flashcards">
        <div className="space-y-8">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Flashcard Study</h1>
                <p className="text-muted-foreground">
                    Choose your study focus: vocabulary words or kanji characters.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
                <Card className="glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Brain className="h-8 w-8 text-blue-500" />
                            <div>
                                <CardTitle>Word Flashcards</CardTitle>
                                <CardDescription>Practice Japanese vocabulary and meanings</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Study Japanese words with configurable display options including hiragana, katakana, kanji, and romaji.
                        </p>
                        <Link href="/study/flashcards/words">
                            <Button className="w-full">
                                Start Word Study
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Languages className="h-8 w-8 text-indigo-500" />
                            <div>
                                <CardTitle>Kanji Flashcards</CardTitle>
                                <CardDescription>Practice kanji characters and readings</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Learn kanji characters with their meanings, on-yomi, and kun-yomi readings based on JLPT levels.
                        </p>
                        <Link href="/study/flashcards/kanji">
                            <Button className="w-full">
                                Start Kanji Study
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
        </SubscriptionGate>
    )
}
