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
        <div className="h-full w-full grid grid-cols-5 gap-1 auto-rows-fr overflow-hidden">
            {kanji.map((k) => (
                <div
                    key={k.id}
                    data-swapy-slot={`pool-kanji-${k.id}`}
                    className="relative h-full min-h-0 max-h-full"
                >
                    <motion.div
                        data-swapy-item={`kanji-pool-${k.id}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-full w-full cursor-grab active:cursor-grabbing"
                    >
                        <Card className="glass-card h-full w-full max-h-full max-w-full flex items-center justify-center p-1 hover:border-primary transition-colors">
                            <CardContent className="p-0 w-full h-full flex flex-col items-center justify-center min-h-0 overflow-hidden">
                                <div className="text-xl font-bold mb-0.5 shrink-0">{k.character}</div>
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

