"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useIsMobile } from "@/components/ui/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation, useQuery } from "@tanstack/react-query"
import { flashcardsV2Api } from "@/services/api"
import {
    Settings,
    Eye,
    HelpCircle,
    CheckCircle,
    XCircle,
    RotateCcw,
    Play
} from "lucide-react"
import type {
    Flashcard,
    FlashcardConfig,
    FlashcardSession,
    FlashcardAnswer,
    FlashcardSubmission,
    FlashcardResult,
    ContentSource
} from "@/types/api"
import { useFlashcardStore } from "@/stores/flashcard-store"
import { PartOfSpeech } from "@/types/pos-enum"
import { PartOfSpeechSelector } from "@/components/ui/part-of-speech-selector"

export function WordsFlashcard() {
    const isMobile = useIsMobile()
    const [session, setSession] = useState<FlashcardSession | null>(null)
    const [cards, setCards] = useState<Flashcard[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [showConfig, setShowConfig] = useState(true)
    const [showResults, setShowResults] = useState(false)
    const [results, setResults] = useState<FlashcardResult | null>(null)
    const [answers, setAnswers] = useState<FlashcardAnswer[]>([])
    const [score, setScore] = useState(0)

    // Use Zustand store for persistent configuration
    const store = useFlashcardStore()
    const {
        level, selectedCourse, selectedUnit, count, selectedPartsOfSpeech,
        showKana, showKanji, showRomaji, showEnglish, showPartOfSpeech,
        askForKana, askForKanji, askForRomaji, askForEnglish, askForPartOfSpeech,
        setLevel, setCourse, setUnit, setCount, setPartsOfSpeech,
        setShowOptions, setAskOptions, validateAndFixOptions
    } = store

    // Validate options on mount and when they change
    useEffect(() => {
        validateAndFixOptions()
    }, [showKana, showKanji, showRomaji, showEnglish, showPartOfSpeech,
        askForKana, askForKanji, askForRomaji, askForEnglish, askForPartOfSpeech])

    // React Query for courses and units based on JLPT level
    const { data: allCourses = [] } = useQuery({
        queryKey: ['courses'],
        queryFn: flashcardsV2Api.courses
    })

    // Filter courses by selected JLPT level (with defensive programming)
    const availableCourses = Array.isArray(allCourses)
        ? allCourses.filter(course => course.level === level)
        : []

    const { data: units = [] } = useQuery({
        queryKey: ['units', selectedCourse],
        queryFn: () => flashcardsV2Api.units(selectedCourse!),
        enabled: selectedCourse !== null
    })

    // Query for available parts of speech
    const { data: availablePartsOfSpeech = [], isLoading: isLoadingParts, error: partsError } = useQuery({
        queryKey: ['parts-of-speech'],
        queryFn: flashcardsV2Api.partsOfSpeech
    })

    // Debug log to see what we're getting
    console.log('Parts of speech query result:', { availablePartsOfSpeech, isLoadingParts, partsError })

    // React Query mutations
    const startSessionMutation = useMutation({
        mutationFn: (config: FlashcardConfig) => flashcardsV2Api.start(config),
        onSuccess: (data) => {
            setSession(data)
            setCards(data.cards)
            setCurrentIndex(0)
            setSelectedOption(null)
            setIsCorrect(null)
            setAnswers([])
            setScore(0)
            setShowConfig(false)
            setShowResults(false)
        },
        onError: (error) => {
            console.error("Failed to start words session:", error)
            alert("Failed to start session. Please try again.")
        }
    })

    const submitSessionMutation = useMutation({
        mutationFn: (submission: FlashcardSubmission) => flashcardsV2Api.submit(submission),
        onSuccess: (data) => {
            setResults(data)
            setShowResults(true)
        },
        onError: (error) => {
            console.error("Failed to submit session:", error)
            alert("Failed to submit session. Results may not be saved.")
        }
    })

    const startSession = async () => {
        // Validate that at least one ask option is selected
        if (!askForKana && !askForKanji && !askForRomaji && !askForEnglish && !askForPartOfSpeech) {
            alert("Please select at least one option to ask for")
            return
        }

        // Determine content source based on selection
        let contentSource: ContentSource
        let courseId: number | undefined
        let unitId: number | undefined

        if (selectedCourse !== null) {
            contentSource = 'unit'
            courseId = selectedCourse
            unitId = selectedUnit || undefined
        } else {
            contentSource = 'jlpt'
        }

        const config: FlashcardConfig = {
            flashcard_type: 'word',
            content_source: contentSource,
            course_id: courseId,
            unit_id: unitId,
            filters: {
                jlpt_levels: [level],
                parts_of_speech: selectedPartsOfSpeech,
                difficulty_levels: [],
                has_kanji: undefined
            },
            word_options: {
                show_kana: showKana,
                show_kanji: showKanji,
                show_romaji: showRomaji,
                show_english: showEnglish,
                show_part_of_speech: showPartOfSpeech,
                ask_for_kana: askForKana,
                ask_for_kanji: askForKanji,
                ask_for_romaji: askForRomaji,
                ask_for_english: askForEnglish,
                ask_for_part_of_speech: askForPartOfSpeech,
            },
            card_count: count,
            shuffle_options: true
        }

        startSessionMutation.mutate(config)
    }

    const handleOptionSelect = (optionIndex: number) => {
        if (selectedOption !== null || !session) return

        setSelectedOption(optionIndex)
        const correct = optionIndex === cards[currentIndex].correct_index
        setIsCorrect(correct)
        if (correct) {
            setScore(prev => prev + 1)
        }

        // Record answer
        const answer: FlashcardAnswer = {
            card_id: cards[currentIndex].id,
            answer: optionIndex,
        }
        setAnswers(prev => [...prev, answer])

        setTimeout(() => {
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(prev => prev + 1)
                setSelectedOption(null)
                setIsCorrect(null)
            } else {
                // Session completed - submit answers
                submitSession([...answers, answer])
            }
        }, 1500)
    }

    const submitSession = async (finalAnswers: FlashcardAnswer[]) => {
        if (!session) return

        const submission: FlashcardSubmission = {
            session_id: session.id,
            answers: finalAnswers,
        }

        submitSessionMutation.mutate(submission)
    }

    const resetSession = () => {
        setSession(null)
        setCards([])
        setCurrentIndex(0)
        setSelectedOption(null)
        setIsCorrect(null)
        setAnswers([])
        setScore(0)
        setShowConfig(true)
        setShowResults(false)
        setResults(null)
    }

    // Results screen
    if (showResults && results) {
        return (
            <div className="flex flex-col min-h-[calc(100vh-8rem)]">
                <Card className="flex-1 glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <CardContent className={`${isMobile ? "p-4" : "p-8"} w-full max-w-lg`}>
                        <div className="flex flex-col items-center justify-center space-y-8">
                            <div className="text-center mb-6">
                                <h2 className={isMobile ? "text-2xl font-bold mb-3" : "text-4xl font-bold mb-4"}>
                                    Words Session Complete!
                                </h2>
                                <div>
                                    <p className={isMobile ? "text-xl font-semibold mb-1" : "text-3xl font-semibold mb-2"}>
                                        Your Score: {results.correct_count}/{results.total}
                                    </p>
                                    <p className={isMobile ? "text-lg" : "text-2xl"} style={{ color: "var(--muted-foreground)" }}>
                                        {Math.round(results.percentage)}% Correct
                                    </p>
                                </div>
                            </div>

                            <div className="w-full space-y-4">
                                <Button
                                    onClick={startSession}
                                    className={`w-full bg-blue-600 hover:bg-blue-700 ${isMobile ? "text-lg h-12" : "text-xl h-14"}`}
                                    disabled={startSessionMutation.isPending}
                                >
                                    {startSessionMutation.isPending ? "Loading..." : "Study Again"}
                                </Button>
                                <Button
                                    onClick={resetSession}
                                    variant="outline"
                                    className={`w-full ${isMobile ? "text-lg h-12" : "text-xl h-14"}`}
                                >
                                    New Configuration
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Configuration screen
    if (showConfig) {
        return (
            <div className="h-full min-h-screen flex flex-col">
                <Card className="glass-card flex-1 m-4">
                    <CardContent className="p-8 space-y-8 h-full flex flex-col">
                        {/* Study Settings */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                                <Settings className="w-6 h-6" />
                                <h3 className="text-lg font-medium">Study Settings</h3>
                                <p className="text-sm text-muted-foreground">Choose your level and session size.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">JLPT Level</Label>
                                    <Select value={level.toString()} onValueChange={(value) => setLevel(parseInt(value))}>
                                        <SelectTrigger>
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
                                    <Label className="text-sm font-medium">Course (Optional)</Label>
                                    <Select
                                        value={selectedCourse?.toString() || "all"}
                                        onValueChange={(value) => setCourse(value === "all" ? null : parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select course" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Courses</SelectItem>
                                            {availableCourses.map((course) => (
                                                <SelectItem key={course.id} value={course.id.toString()}>
                                                    {course.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Unit (Optional)</Label>
                                    <Select
                                        value={selectedUnit?.toString() || "all"}
                                        onValueChange={(value) => setUnit(value === "all" ? null : parseInt(value))}
                                        disabled={!selectedCourse}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={selectedCourse ? "Select unit" : "Select course first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Units</SelectItem>
                                            {units.map((unit) => (
                                                <SelectItem key={unit.id} value={unit.id.toString()}>
                                                    {unit.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Number of Cards</Label>
                                    <Select value={count.toString()} onValueChange={(value) => setCount(parseInt(value))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Card count" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5 cards</SelectItem>
                                            <SelectItem value="10">10 cards</SelectItem>
                                            <SelectItem value="15">15 cards</SelectItem>
                                            <SelectItem value="20">20 cards</SelectItem>
                                            <SelectItem value="25">25 cards</SelectItem>
                                            <SelectItem value="30">30 cards</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Part of Speech Filter */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-2">
                                <HelpCircle className="w-6 h-6 text-green-500" />
                                <div>
                                    <h3 className="text-lg font-medium">Part of Speech Filter</h3>
                                    <p className="text-sm text-muted-foreground">Filter words by grammatical category.</p>
                                </div>
                            </div>

                            <PartOfSpeechSelector
                                selectedParts={selectedPartsOfSpeech}
                                availableParts={Array.isArray(availablePartsOfSpeech) ? availablePartsOfSpeech : []}
                                onSelectionChange={setPartsOfSpeech}
                            />
                        </div>

                        {/* Two column layout for display and quiz options */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Card Display Options */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-2">
                                    <HelpCircle className="w-6 h-6 text-blue-500" />
                                    <div>
                                        <h3 className="text-lg font-medium">Card Display Options</h3>
                                        <p className="text-sm text-muted-foreground">What appears on each card.</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Show Kana (ひらがな/カタカナ)</Label>
                                        <Switch
                                            checked={showKana}
                                            onCheckedChange={(value) => setShowOptions({ showKana: value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Show Kanji (漢字)</Label>
                                        <Switch
                                            checked={showKanji}
                                            onCheckedChange={(value) => setShowOptions({ showKanji: value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Show Romaji</Label>
                                        <Switch
                                            checked={showRomaji}
                                            onCheckedChange={(value) => setShowOptions({ showRomaji: value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Show English</Label>
                                        <Switch
                                            checked={showEnglish}
                                            onCheckedChange={(value) => setShowOptions({ showEnglish: value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Show Part of Speech</Label>
                                        <Switch
                                            checked={showPartOfSpeech}
                                            onCheckedChange={(value) => setShowOptions({ showPartOfSpeech: value })}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{[showKanji, showRomaji, showEnglish, showPartOfSpeech].filter(Boolean).length + 1} selected</p>
                            </div>

                            {/* Quiz Settings */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-2">
                                    <HelpCircle className="w-6 h-6 text-red-500" />
                                    <div>
                                        <h3 className="text-lg font-medium">Quiz Settings</h3>
                                        <p className="text-sm text-muted-foreground">What the question asks you to recall (choose at least one).</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Ask for Kana</Label>
                                        <Switch
                                            checked={askForKana}
                                            onCheckedChange={(value) => setAskOptions({ askForKana: value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Ask for Kanji</Label>
                                        <Switch
                                            checked={askForKanji}
                                            onCheckedChange={(value) => setAskOptions({ askForKanji: value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Ask for Romaji</Label>
                                        <Switch
                                            checked={askForRomaji}
                                            onCheckedChange={(value) => setAskOptions({ askForRomaji: value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Ask for English</Label>
                                        <Switch
                                            checked={askForEnglish}
                                            onCheckedChange={(value) => setAskOptions({ askForEnglish: value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Ask for Part of Speech</Label>
                                        <Switch
                                            checked={askForPartOfSpeech}
                                            onCheckedChange={(value) => setAskOptions({ askForPartOfSpeech: value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setAskOptions({
                                                askForKana: true,
                                                askForKanji: true,
                                                askForRomaji: true,
                                                askForEnglish: true,
                                                askForPartOfSpeech: true
                                            })
                                        }}
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setAskOptions({
                                                askForKana: false,
                                                askForKanji: false,
                                                askForRomaji: false,
                                                askForEnglish: false,
                                                askForPartOfSpeech: false
                                            })
                                        }}
                                    >
                                        Clear
                                    </Button>
                                    <p className="text-xs text-muted-foreground self-center ml-2">
                                        {[askForKana, askForKanji, askForRomaji, askForEnglish, askForPartOfSpeech].filter(Boolean).length} selected
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Start Button */}
                        <div className="pt-4 border-t border-border/50">
                            <Button
                                onClick={startSession}
                                className="w-full h-12 text-lg font-medium"
                                disabled={startSessionMutation.isPending}
                            >
                                <Play className="w-5 h-5 mr-2" />
                                {startSessionMutation.isPending ? "Loading..." : "Start Word Study"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (startSessionMutation.isPending || submitSessionMutation.isPending) {
        return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">Loading...</div>
    }

    if (!session || cards.length === 0) {
        return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">No words available</div>
    }

    const currentCard = cards[currentIndex]
    const progressText = `Word ${currentIndex + 1} of ${cards.length}`
    const progressPercentage = ((currentIndex + 1) / cards.length) * 100

    // Mobile layout
    if (isMobile) {
        return (
            <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{progressText}</span>
                        <span>Score: {score}/{cards.length}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                <Card className="glass-card">
                    <CardContent className="p-6 space-y-6">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="text-center space-y-3"
                        >
                            {currentCard.question.kanji && showKanji && (
                                <h2 className="text-4xl font-bold">{currentCard.question.kanji}</h2>
                            )}
                            {currentCard.question.kana && (
                                <p className="text-3xl text-primary">{currentCard.question.kana}</p>
                            )}
                            {currentCard.question.romaji && showRomaji && (
                                <p className="text-xl text-muted-foreground">{currentCard.question.romaji}</p>
                            )}
                        </motion.div>

                        <div className="space-y-3">
                            {currentCard.options.map((option, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                    <Button
                                        className={`w-full p-4 h-auto text-lg justify-center transition-all duration-200 ${selectedOption !== null
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
                                        {option.english || option.kana || option.romaji || option.kanji}
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
        <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-3">
                <div className="flex justify-between text-lg text-muted-foreground">
                    <span>{progressText}</span>
                    <span>Score: {score}/{cards.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                    <div
                        className="bg-primary h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            <Card className="glass-card min-h-[70vh]">
                <CardContent className="p-12 h-full flex flex-col justify-center">
                    <div className="max-w-4xl mx-auto w-full">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="text-center mb-16 space-y-6"
                        >
                            {currentCard.question.kanji && showKanji && (
                                <h2 className="text-8xl font-bold">{currentCard.question.kanji}</h2>
                            )}
                            {currentCard.question.kana && (
                                <p className="text-5xl text-primary">{currentCard.question.kana}</p>
                            )}
                            {currentCard.question.romaji && showRomaji && (
                                <p className="text-4xl text-muted-foreground">{currentCard.question.romaji}</p>
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
                                        className={`w-full p-10 h-auto text-3xl justify-center transition-all duration-200 ${selectedOption !== null
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
                                        {option.english || option.kana || option.romaji || option.kanji}
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
