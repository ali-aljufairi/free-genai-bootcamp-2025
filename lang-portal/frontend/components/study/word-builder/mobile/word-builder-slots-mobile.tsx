"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Kanji } from "@/types/api"
import { useWordBuilderStore } from "@/stores/word-builder-store"

interface WordBuilderSlotsMobileProps {
    slots: (Kanji | null)[]
    onValidate: () => void
}

export function WordBuilderSlotsMobile({ slots, onValidate }: WordBuilderSlotsMobileProps) {
    const { removeKanjiFromSlot, preferences } = useWordBuilderStore()
    const hasKanji = slots.some(s => s !== null)
    const showHints = preferences.show_hints

    return (
        <div className="h-full flex flex-col space-y-2">
            <div className="flex items-center justify-between shrink-0">
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
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-2">
                {slots.map((kanji, index) => (
                    <div
                        key={index}
                        data-swapy-slot={`slot-${index}`}
                        className="relative h-full min-h-0"
                    >
                        {/* data-swapy-item MUST be direct child of data-swapy-slot */}
                        {kanji ? (
                            <div
                                data-swapy-item={`kanji-slot-${kanji.id}-${index}`}
                                className="h-full w-full"
                            >
                                <Card className="glass-card h-full w-full flex items-center justify-center p-2 transition-colors border-primary bg-primary/5">
                                    <CardContent className="p-0 w-full h-full flex flex-col items-center justify-center relative">
                                        <motion.div
                                            key={kanji.id}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="w-full h-full flex flex-col items-center justify-center"
                                        >
                                            <div className="text-4xl font-bold mb-1">{kanji.character}</div>
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
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div
                                data-swapy-item={`placeholder-slot-${index}`}
                                className="h-full w-full"
                            >
                                <Card className="glass-card h-full w-full flex items-center justify-center p-2 transition-colors border-dashed border-2 border-muted-foreground/30">
                                    <CardContent className="p-0 w-full h-full flex flex-col items-center justify-center">
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-muted-foreground/50 text-sm w-full h-full flex items-center justify-center"
                                        >
                                            Slot {index + 1}
                                        </motion.div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

