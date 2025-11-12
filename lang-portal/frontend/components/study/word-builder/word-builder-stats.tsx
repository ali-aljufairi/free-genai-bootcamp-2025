"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Target, Clock } from "lucide-react"

interface WordBuilderStatsProps {
    wordsFormed: number
    totalAttempts: number
    timeRemaining: number
}

export function WordBuilderStats({ wordsFormed, totalAttempts, timeRemaining }: WordBuilderStatsProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <Card className="glass-card">
            <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-2xl font-bold">{wordsFormed}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Words Formed</p>
                    </div>

                    <div>
                        <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                            <Target className="w-4 h-4" />
                            <span className="text-2xl font-bold">{totalAttempts}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Total Attempts</p>
                    </div>

                    <div>
                        <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-2xl font-bold">{formatTime(timeRemaining)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Time Remaining</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

