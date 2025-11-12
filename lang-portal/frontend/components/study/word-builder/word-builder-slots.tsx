"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Kanji } from "@/types/api"
import { useWordBuilderStore } from "@/stores/word-builder-store"

interface WordBuilderSlotsProps {
    slots: (Kanji | null)[]
    onValidate: () => void
}

export function WordBuilderSlots({ slots, onValidate }: WordBuilderSlotsProps) {
    const { removeKanjiFromSlot, placeKanjiInSlot, kanjiPool, preferences } = useWordBuilderStore()
    const hasKanji = slots.some(s => s !== null)
    const showHints = preferences.show_hints

    // Handle drop events for manual slot management
    const handleDrop = (e: React.DragEvent, slotIndex: number) => {
        e.preventDefault()
        const kanjiId = e.dataTransfer.getData('kanji-id')
        if (kanjiId) {
            const kanji = kanjiPool.find(k => k.id === parseInt(kanjiId))
            if (kanji) {
                placeKanjiInSlot(kanji, slotIndex)
            }
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Word Builder</h3>
                {hasKanji && !preferences.auto_validate && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onValidate}
                        className="h-8"
                    >
                        Validate Word
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-4 gap-2">
                {slots.map((kanji, index) => (
                    <div
                        key={index}
                        className="relative"
                    >
                        <Card
                            className={`glass-card aspect-square flex items-center justify-center p-2 transition-colors ${kanji
                                    ? 'border-primary bg-primary/5'
                                    : 'border-dashed border-2 border-muted-foreground/30'
                                }`}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragOver={handleDragOver}
                        >
                            <CardContent className="p-0 w-full h-full flex flex-col items-center justify-center relative">
                                <AnimatePresence mode="wait">
                                    {kanji ? (
                                        <motion.div
                                            key={kanji.id}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="w-full h-full flex flex-col items-center justify-center"
                                        >
                                            <div className="text-3xl font-bold mb-1">{kanji.character}</div>
                                            {showHints && (
                                                <div className="text-xs text-muted-foreground text-center space-y-0.5">
                                                    {kanji.meanings && kanji.meanings.length > 0 && (
                                                        <div className="line-clamp-1">{kanji.meanings[0]}</div>
                                                    )}
                                                    {(kanji.onyomi || kanji.kunyomi) && (
                                                        <div className="text-[10px] opacity-75">
                                                            {kanji.onyomi && <span>{kanji.onyomi}</span>}
                                                            {kanji.onyomi && kanji.kunyomi && <span> / </span>}
                                                            {kanji.kunyomi && <span>{kanji.kunyomi}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    removeKanjiFromSlot(index)
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-muted-foreground/50 text-sm w-full h-full flex items-center justify-center"
                                        >
                                            Slot {index + 1}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    )
}

