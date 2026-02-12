"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eraser, Pencil, RotateCcw, Send, Trash2, RefreshCw } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KanjiStrokeGuide } from './kanji-stroke-guide'
import { Eye, EyeOff } from 'lucide-react'
import { useApiClient } from '@/hooks/useApiClient'

interface Word {
    id: number
    japanese: string
    romaji: string
    english: string
    parts: {
        type: string
    }
}

interface Sentence {
    sentence: string
    english: string
    romaji: string
    word: string
}

interface Kanji {
    id: number
    character: string
    meanings: string[]
    onyomi?: string
    kunyomi?: string
    jlpt?: number
    stroke_count?: number
    strokes_svg?: string
}

export function DrawingStudy() {
    const apiClient = useApiClient()
    const [word, setWord] = useState<Word | null>(null)
    const [sentence, setSentence] = useState<Sentence | null>(null)
    const [kanji, setKanji] = useState<Kanji | null>(null)
    const [feedback, setFeedback] = useState<string>('')
    const [isEraseMode, setIsEraseMode] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)
    const [studyMode, setStudyMode] = useState<'word' | 'sentence' | 'kanji'>('kanji')
    const [isLoading, setIsLoading] = useState(false)
    const [showKanjiGuide, setShowKanjiGuide] = useState(true)
    const canvasRef = useRef<ReactSketchCanvasRef | null>(null)

    const handlePointerDown = useCallback(() => setIsDrawing(true), [])
    const handlePointerUp = useCallback(() => setIsDrawing(false), [])

    const fetchRandomWord = useCallback(async () => {
        try {
            const data = await apiClient.get<Word>(`/api/langportal/words/random`)
            setWord(data)
        } catch (error) {
            console.error('Error fetching word:', error)
        }
    }, [apiClient])

    const fetchRandomSentence = useCallback(async () => {
        try {
            const data = await apiClient.get<Sentence>(`/api/writing/random-sentence`)
            setSentence(data)
        } catch (error) {
            console.error('Error fetching sentence:', error)
        }
    }, [apiClient])

    const fetchRandomKanji = useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await apiClient.get<Kanji>(`/api/writing/kanji/random`)
            setKanji(data)
        } catch (error) {
            console.error('Error fetching kanji:', error)
        } finally {
            setIsLoading(false)
        }
    }, [apiClient])

    const handleSubmit = async () => {
        try {
            if (!canvasRef.current) return

            const canvas = canvasRef.current
            const paths = await canvas.exportPaths()
            const hasAnyStroke = Array.isArray(paths) && paths.some((path) => path.paths.length > 0)
            if (!hasAnyStroke) {
                const label = studyMode === 'kanji' ? 'kanji' : studyMode === 'sentence' ? 'sentence' : 'word'
                setFeedback(`Canvas is empty. Please draw the ${label} before submitting.`)
                return
            }

            const base64Image = await canvas.exportImage('png')
            const imageData = base64Image.split(',')[1]

            if (studyMode === 'word') {
                const data = await apiClient.post<{ feedback: string }>(`/api/writing/feedback-word`, {
                    image: imageData,
                    target_word: word?.japanese
                })
                setFeedback(data.feedback)
            } else if (studyMode === 'sentence') {
                const data = await apiClient.post<{ feedback: string }>(`/api/writing/feedback-sentence`, {
                    image: imageData,
                    target_sentence: sentence?.sentence
                })
                setFeedback(data.feedback)
            } else {
                const data = await apiClient.post<{ feedback: string; accuracy: number; grade: string }>(`/api/writing/kanji/feedback`, {
                    image: imageData,
                    kanji_id: kanji?.id,
                    character: kanji?.character
                })
                setFeedback(`Accuracy: ${data.accuracy.toFixed(1)}% - Grade: ${data.grade}\n${data.feedback}`)
            }
        } catch (error) {
            console.error('Error submitting drawing:', error)
            setFeedback('Error submitting drawing. Please try again.')
        }
    }

    const handleRefresh = async () => {
        canvasRef.current?.clearCanvas();
        setFeedback('');
        setIsLoading(true)

        try {
            if (studyMode === 'word') {
                await fetchRandomWord();
            } else if (studyMode === 'sentence') {
                await fetchRandomSentence();
            } else {
                await fetchRandomKanji();
            }
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRandomWord()
        fetchRandomSentence()
        fetchRandomKanji()
    }, [fetchRandomWord, fetchRandomSentence, fetchRandomKanji])

    useEffect(() => {
        if (studyMode === 'word' && !word) {
            fetchRandomWord()
        } else if (studyMode === 'sentence' && !sentence) {
            fetchRandomSentence()
        } else if (studyMode === 'kanji' && !kanji) {
            fetchRandomKanji()
        }
    }, [studyMode, word, sentence, kanji, fetchRandomWord, fetchRandomSentence, fetchRandomKanji])

    if ((studyMode === 'word' && !word) || (studyMode === 'sentence' && !sentence) || (studyMode === 'kanji' && !kanji)) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4">
            <Card className="glass-card overflow-hidden rounded-xl border border-blue-100/80 dark:border-blue-900/70 shadow-xl p-6">
                <Tabs value={studyMode} onValueChange={(value) => setStudyMode(value as 'word' | 'sentence' | 'kanji')} className="mb-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="kanji">Kanji Practice</TabsTrigger>
                        <TabsTrigger value="word">Word Practice</TabsTrigger>
                        <TabsTrigger value="sentence">Sentence Practice</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="text-center mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            size="sm"
                            className="flex gap-2"
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            New {studyMode === 'word' ? 'Word' : studyMode === 'sentence' ? 'Sentence' : 'Kanji'}
                        </Button>
                        {studyMode === 'kanji' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowKanjiGuide(!showKanjiGuide)}
                            >
                                {showKanjiGuide ? (
                                    <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Hide Guide
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Show Guide
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    {studyMode === 'word' && word && (
                        <>
                            <h2 className="text-4xl md:text-5xl font-bold mb-3">{word.japanese}</h2>
                            <div className="space-y-1">
                                <p className="text-lg text-muted-foreground">{word.romaji}</p>
                                <p className="text-base text-foreground">{word.english}</p>
                            </div>
                        </>
                    )}
                    {studyMode === 'sentence' && sentence && (
                        <>
                            <h2 className="text-2xl md:text-3xl font-bold mb-3">{sentence.sentence}</h2>
                            <div className="space-y-1">
                                <p className="text-base text-muted-foreground">{sentence.romaji}</p>
                                <p className="text-base text-foreground">{sentence.english}</p>
                                <div className="mt-2 inline-block px-3 py-1 rounded-full bg-blue-100/50 dark:bg-blue-900/30 border border-blue-200/50 dark:border-blue-800/50">
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Focus: {sentence.word}</span>
                                </div>
                            </div>
                        </>
                    )}
                    {studyMode === 'kanji' && kanji && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="flex items-center justify-center h-[300px]">
                                    <h2 className="text-8xl md:text-9xl font-bold text-center">{kanji.character}</h2>
                                </div>
                                <div className="space-y-2 text-center">
                                    <p className="text-lg font-medium text-foreground">
                                        {kanji.meanings?.join(', ')}
                                    </p>
                                    {(kanji.onyomi || kanji.kunyomi) && (
                                        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                                            {kanji.onyomi && (
                                                <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/30">
                                                    音読み: <span className="font-medium">{kanji.onyomi}</span>
                                                </span>
                                            )}
                                            {kanji.kunyomi && (
                                                <span className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/30">
                                                    訓読み: <span className="font-medium">{kanji.kunyomi}</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground justify-center">
                                        {kanji.jlpt && (
                                            <span>JLPT N{kanji.jlpt}</span>
                                        )}
                                        {kanji.stroke_count && (
                                            <span>{kanji.stroke_count} strokes</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {kanji.strokes_svg && (
                                <div className="flex flex-col items-center justify-center">
                                    <KanjiStrokeGuide
                                        svgData={kanji.strokes_svg}
                                        strokeCount={kanji.stroke_count}
                                        showGuide={showKanjiGuide}
                                        onToggleGuide={setShowKanjiGuide}
                                        isDrawing={isDrawing}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">
                                {studyMode === 'kanji' ? 'Draw the Kanji' : studyMode === 'sentence' ? 'Write the Sentence' : 'Write the Word'}
                            </h3>
                            <p className="text-sm text-muted-foreground">Use your mouse or touch to draw</p>
                        </div>
                        <div
                            className="w-full h-[400px] border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-gray-900 dark:to-gray-950 relative shadow-inner touch-none"
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 dark:opacity-10 pointer-events-none" />
                            <ReactSketchCanvas
                                ref={canvasRef}
                                strokeWidth={6}
                                strokeColor="#111827"
                                canvasColor="#ffffff"
                                className="w-full h-full relative z-10 touch-none"
                                style={{
                                    border: 'none',
                                    touchAction: 'none',
                                }}
                            />
                            {!canvasRef.current && (
                                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                                    <p className="text-muted-foreground/50 text-sm">Start drawing here...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                onClick={() => canvasRef.current?.clearCanvas()}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Clear
                            </Button>
                            <Button
                                onClick={() => canvasRef.current?.undo()}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <RotateCcw className="h-4 w-4 scale-x-[-1]" />
                                Undo
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsEraseMode(!isEraseMode);
                                    canvasRef.current?.eraseMode(!isEraseMode);
                                }}
                                variant={isEraseMode ? "secondary" : "outline"}
                                size="sm"
                                className="gap-2"
                            >
                                {isEraseMode ? (
                                    <>
                                        <Pencil className="h-4 w-4" />
                                        Draw
                                    </>
                                ) : (
                                    <>
                                        <Eraser className="h-4 w-4" />
                                        Erase
                                    </>
                                )}
                            </Button>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Submit
                        </Button>
                    </div>

                    {feedback && (
                        <Alert className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                            <AlertDescription className="whitespace-pre-wrap">{feedback}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </Card>
        </div>
    )
}
