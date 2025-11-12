"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import type { Kanji } from "@/types/api"
import { useWordBuilderStore } from "@/stores/word-builder-store"

interface WordBuilderKanjiPoolProps {
    kanji: Kanji[]
}

export function WordBuilderKanjiPool({ kanji }: WordBuilderKanjiPoolProps) {
    const { preferences } = useWordBuilderStore()
    const showHints = preferences.show_hints

    const handleDragStart = (e: React.DragEvent, kanjiId: number) => {
        e.dataTransfer.setData('kanji-id', kanjiId.toString())
        e.dataTransfer.effectAllowed = 'move'
    }

    return (
        <div className="grid grid-cols-5 gap-2">
            {kanji.map((k) => (
                <div
                    key={k.id}
                    className="relative"
                >
                    <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, k.id)}
                        className="cursor-grab active:cursor-grabbing"
                    >
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Card className="glass-card aspect-square flex items-center justify-center p-1.5 hover:border-primary transition-colors">
                                <CardContent className="p-0 w-full h-full flex flex-col items-center justify-center">
                                    <div className="text-2xl font-bold mb-0.5">{k.character}</div>
                                    {showHints && (
                                        <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
                                            {k.meanings && k.meanings.length > 0 && (
                                                <div className="line-clamp-1">{k.meanings[0]}</div>
                                            )}
                                            {(k.onyomi || k.kunyomi) && (
                                                <div className="text-[9px] opacity-75">
                                                    {k.onyomi && <span>{k.onyomi}</span>}
                                                    {k.onyomi && k.kunyomi && <span> / </span>}
                                                    {k.kunyomi && <span>{k.kunyomi}</span>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            ))}
        </div>
    )
}

