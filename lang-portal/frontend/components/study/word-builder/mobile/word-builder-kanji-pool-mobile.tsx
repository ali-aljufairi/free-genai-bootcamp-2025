"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import type { Kanji } from "@/types/api"
import { useWordBuilderStore } from "@/stores/word-builder-store"

interface WordBuilderKanjiPoolMobileProps {
    kanji: Kanji[]
}

export function WordBuilderKanjiPoolMobile({ kanji }: WordBuilderKanjiPoolMobileProps) {
    const { preferences } = useWordBuilderStore()
    const showHints = preferences.show_hints

    return (
        <div className="h-full w-full grid grid-cols-5 gap-1 auto-rows-[minmax(2.5rem,1fr)] overflow-hidden">
            {kanji.map((k) => (
                <div
                    key={k.id}
                    data-swapy-slot={`pool-kanji-${k.id}`}
                    className="relative h-full min-h-0 max-h-full [&_button]:hidden"
                >
                    <motion.div
                        data-swapy-item={`kanji-pool-${k.id}`}
                        className="h-full w-full cursor-grab active:cursor-grabbing"
                    >
                        <Card className="glass-card h-full w-full max-h-full max-w-full flex items-center justify-center p-1 transition-colors bg-blue-500/10 border-blue-500/30 [&:hover]:transform-none [&:hover]:scale-100">
                            <CardContent className="p-0 w-full h-full flex flex-col items-center justify-center min-h-0 overflow-visible">
                                <div className="text-[clamp(0.75rem,2vmin,1.25rem)] font-bold leading-none mb-0.5 shrink-0 flex items-center justify-center">{k.character}</div>
                                {showHints && (
                                    <div className="text-[10px] text-muted-foreground text-center space-y-0.5 shrink-0">
                                        {k.meanings && k.meanings.length > 0 && (
                                            <div className="line-clamp-1">{k.meanings[0]}</div>
                                        )}
                                        {(k.onyomi || k.kunyomi) && (
                                            <div className="text-[8px] opacity-75">
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
            ))}
        </div>
    )
}

