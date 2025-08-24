"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useIsMobile } from "@/components/ui/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { flashcardsV2Api } from "@/services/api"
import type { Flashcard, FlashcardConfig, FlashcardSession } from "@/types/api"

export function KanjiFlashcard() {
    const isMobile = useIsMobile()
    const [session, setSession] = useState<FlashcardSession | null>(null)
    const [cards, setCards] = useState<Flashcard[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showConfig, setShowConfig] = useState(true)
    const [score, setScore] = useState(0)

    // Configuration options
    const [level, setLevel] = useState<number>(5)
    const [count, setCount] = useState<number>(10)
    const [showReadings, setShowReadings] = useState<boolean>(false)

    const startSession = async () => {
        setIsLoading(true)
        try {
            const config: FlashcardConfig = {
                flashcard_type: 'kanji',
                content_source: 'jlpt',
                filters: {
                    jlpt_levels: [level],
                    parts_of_speech: [],
                    difficulty_levels: [],
                    has_kanji: undefined,
                },
                kanji_options: {
                    show_character: true,
                    show_onyomi: showReadings,
                    show_kunyomi: showReadings,
                    show_english: false,
                    ask_for_character: false,
                    ask_for_onyomi: false,
                    ask_for_kunyomi: false,
                    ask_for_english: true,
                },
                word_options: undefined,
                card_count: count,
                time_limit: undefined,
                shuffle_options: true,
            }

            const s = await flashcardsV2Api.start(config)
            setSession(s)
            setCards(s.cards)
            setCurrentIndex(0)
            setSelectedOption(null)
            setIsCorrect(null)
            setScore(0)
            setShowConfig(false)
        } catch (error) {
            console.error("Failed to start kanji session:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleOptionSelect = (optionIndex: number) => {
        if (selectedOption !== null) return

        setSelectedOption(optionIndex)
        const correct = optionIndex === cards[currentIndex].correct_index
        setIsCorrect(correct)

        if (correct) {
            setScore(prev => prev + 1)
        }

        setTimeout(() => {
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(prev => prev + 1)
                setSelectedOption(null)
                setIsCorrect(null)
            } else {
                // Session completed - show results
                setShowConfig(true)
            }
        }, 1500)
    }

    const resetSession = () => {
        setSession(null)
        setCards([])
        setCurrentIndex(0)
        setSelectedOption(null)
        setIsCorrect(null)
        setScore(0)
        setShowConfig(true)
    }

    // Configuration screen
    if (showConfig) {
        return (
            <div className="flex flex-col min-h-[calc(100vh-8rem)]">
                <Card className="flex-1 glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <CardContent className={`${isMobile ? "p-4" : "p-8"} w-full max-w-lg`}>
                        <div className="flex flex-col items-center justify-center space-y-8">
                            <div className="text-center mb-6">
                                <h2 className={isMobile ? "text-2xl font-bold mb-3" : "text-4xl font-bold mb-4"}>
                                    {score > 0 ? "Kanji Session Complete!" : "Configure Kanji Flashcards"}
                                </h2>
                                {score > 0 && (
                                    <div>
                                        <p className={isMobile ? "text-xl font-semibold mb-1" : "text-3xl font-semibold mb-2"}>
                                            Your Score: {score}/{cards.length}
                                        </p>
                                        <p className={isMobile ? "text-lg" : "text-2xl"} style={{ color: "var(--muted-foreground)" }}>
                                            {Math.round((score / cards.length) * 100)}% Correct
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="w-full space-y-6">
                                <div className="space-y-2">
                                    <p className={`text-center ${isMobile ? "text-base" : "text-lg"}`} style={{ color: "var(--muted-foreground)" }}>
                                        JLPT Level:
                                    </p>
                                    <Select
                                        value={level.toString()}
                                        onValueChange={(value) => setLevel(parseInt(value))}
                                    >
                                        <SelectTrigger className={`w-full ${isMobile ? "text-base p-4" : "text-lg p-6"}`}>
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">N5 (Beginner)</SelectItem>
                                            <SelectItem value="4">N4</SelectItem>
                                            <SelectItem value="3">N3</SelectItem>
                                            <SelectItem value="2">N2</SelectItem>
                                            <SelectItem value="1">N1 (Advanced)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <p className={`text-center ${isMobile ? "text-base" : "text-lg"}`} style={{ color: "var(--muted-foreground)" }}>
                                        Number of cards:
                                    </p>
                                    <Select
                                        value={count.toString()}
                                        onValueChange={(value) => setCount(parseInt(value))}
                                    >
                                        <SelectTrigger className={`w-full ${isMobile ? "text-base p-4" : "text-lg p-6"}`}>
                                            <SelectValue placeholder="Card count" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5 cards</SelectItem>
                                            <SelectItem value="10">10 cards</SelectItem>
                                            <SelectItem value="15">15 cards</SelectItem>
                                            <SelectItem value="20">20 cards</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className={`${isMobile ? "text-base" : "text-lg"}`} style={{ color: "var(--muted-foreground)" }}>
                                        Show readings:
                                    </p>
                                    <Switch
                                        checked={showReadings}
                                        onCheckedChange={setShowReadings}
                                    />
                                </div>

                                <Button
                                    onClick={score > 0 ? resetSession : startSession}
                                    className={`w-full bg-blue-600 hover:bg-blue-700 ${isMobile ? "text-lg h-12" : "text-xl h-14"}`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Loading..." : score > 0 ? "Study More Kanji" : "Start Kanji Study"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">Loading...</div>
    }

    if (!session || cards.length === 0) {
        return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">No kanji available</div>
    }

    const currentCard = cards[currentIndex]
    const progressText = `Kanji ${currentIndex + 1} of ${cards.length}`

    // Mobile layout
    if (isMobile) {
        return (
            <div className="flex flex-col min-h-[calc(100vh-8rem)]">
                <Card className="flex-1 glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                    <CardHeader className="border-b py-3 px-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                {progressText}
                            </p>
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                Score: {score}
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 flex flex-col gap-6">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="text-center mb-2"
                        >
                            {currentCard.question.character && (
                                <h2 className="text-8xl font-bold mb-4">{currentCard.question.character}</h2>
                            )}
                            {showReadings && (
                                <div className="space-y-1">
                                    {currentCard.question.onyomi && (
                                        <p className="text-lg text-muted-foreground">On: {currentCard.question.onyomi}</p>
                                    )}
                                    {currentCard.question.kunyomi && (
                                        <p className="text-lg text-muted-foreground">Kun: {currentCard.question.kunyomi}</p>
                                    )}
                                </div>
                            )}
                        </motion.div>

                        <div className="grid grid-cols-1 gap-4">
                            {currentCard.options.map((option, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                    <Button
                                        className={`w-full p-4 h-auto text-lg text-center justify-center transition-all duration-200 ${selectedOption !== null
                                                ? index === currentCard.correct_index
                                                    ? "bg-green-500 hover:bg-green-600 text-white"
                                                    : selectedOption === index
                                                        ? "bg-red-400 hover:bg-red-400 text-white"
                                                        : "opacity-70"
                                                : "hover:bg-accent"
                                            }`}
                                        variant="outline"
                                        onClick={() => handleOptionSelect(index)}
                                        disabled={selectedOption !== null}
                                    >
                                        {option.meanings || option.onyomi || option.kunyomi}
                                    </Button>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Desktop layout
    return (
        <div className="flex flex-col min-h-[calc(100vh-8rem)]">
            <Card className="flex-1 glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                <CardHeader className="border-b py-4 px-8">
                    <div className="flex justify-between items-center">
                        <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
                            {progressText}
                        </p>
                        <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
                            Score: {score}
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="p-12">
                    <div className="flex flex-col h-full max-w-6xl mx-auto">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="text-center mb-12"
                        >
                            {currentCard.question.character && (
                                <h2 className="text-9xl font-bold mb-6">{currentCard.question.character}</h2>
                            )}
                            {showReadings && (
                                <div className="space-y-2">
                                    {currentCard.question.onyomi && (
                                        <p className="text-2xl text-muted-foreground">On-yomi: {currentCard.question.onyomi}</p>
                                    )}
                                    {currentCard.question.kunyomi && (
                                        <p className="text-2xl text-muted-foreground">Kun-yomi: {currentCard.question.kunyomi}</p>
                                    )}
                                </div>
                            )}
                        </motion.div>

                        <div className="grid grid-cols-2 gap-8">
                            {currentCard.options.map((option, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                    <Button
                                        className={`w-full p-8 h-auto text-2xl text-center justify-center transition-all duration-200 ${selectedOption !== null
                                                ? index === currentCard.correct_index
                                                    ? "bg-green-500 hover:bg-green-600 text-white"
                                                    : selectedOption === index
                                                        ? "bg-red-400 hover:bg-red-400 text-white"
                                                        : "opacity-70"
                                                : "hover:bg-accent hover:scale-102"
                                            }`}
                                        variant="outline"
                                        onClick={() => handleOptionSelect(index)}
                                        disabled={selectedOption !== null}
                                    >
                                        {option.meanings || option.onyomi || option.kunyomi}
                                    </Button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
