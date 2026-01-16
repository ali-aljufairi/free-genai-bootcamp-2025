"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import { flashcardsV2Api } from "@/services/api"
import type {
  Flashcard,
  FlashcardConfig,
  FlashcardSession,
  FlashcardAnswer,
  FlashcardSubmission,
  FlashcardResult,
  Course,
  Unit,
  WordPracticeOptions,
  KanjiPracticeOptions,
  ContentFilters
} from "@/types/api"
import { BookOpen, Brain, Play, RotateCcw, Check, X, Clock, Target } from "lucide-react"
import { useUserSettingsStore } from "@/stores/user-settings-store"

export function UnifiedFlashcard() {
  const globalJlptLevel = useUserSettingsStore((s) => s.currentJlptLevel)

  // Session state
  const [session, setSession] = useState<FlashcardSession | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [answers, setAnswers] = useState<FlashcardAnswer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(true)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<FlashcardResult | null>(null)

  // Configuration state
  const [flashcardType, setFlashcardType] = useState<'word' | 'kanji'>('word')
  const [contentSource, setContentSource] = useState<'unit' | 'group' | 'jlpt' | 'srs'>('jlpt')
  const [cardCount, setCardCount] = useState(10)
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [shuffleOptions, setShuffleOptions] = useState(true)

  // Content source specific state
  const [courses, setCourses] = useState<Course[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [partsOfSpeech, setPartsOfSpeech] = useState<string[]>([])

  // Word practice options
  const [wordOptions, setWordOptions] = useState<WordPracticeOptions>({
    show_kana: true,
    show_kanji: true,
    show_romaji: true,
    show_english: false,
    show_part_of_speech: false,
    ask_for_kana: false,
    ask_for_kanji: false,
    ask_for_romaji: false,
    ask_for_english: true,
    ask_for_part_of_speech: false,
  })

  // Kanji practice options
  const [kanjiOptions, setKanjiOptions] = useState<KanjiPracticeOptions>({
    show_character: true,
    show_onyomi: false,
    show_kunyomi: false,
    show_english: false,
    ask_for_character: false,
    ask_for_onyomi: false,
    ask_for_kunyomi: false,
    ask_for_english: true,
  })

  // Filter options
  const [filters, setFilters] = useState<ContentFilters>({
    jlpt_levels: [globalJlptLevel || 5],
    parts_of_speech: [],
    difficulty_levels: [],
    has_kanji: undefined,
  })

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const coursesData = await flashcardsV2Api.courses()
        setCourses(coursesData)
        setPartsOfSpeech([])
      } catch (error) {
        console.error("Failed to load initial data:", error)
      }
    }
    loadData()
  }, [])

  // Load units when course is selected
  useEffect(() => {
    if (selectedCourseId) {
      flashcardsV2Api.units(selectedCourseId)
        .then(setUnits)
        .catch(() => setUnits([]))
    } else {
      setUnits([])
      setSelectedUnitId(null)
    }
  }, [selectedCourseId])

  const validateConfiguration = (): string | null => {
    // Check content source requirements
    if (contentSource === 'unit' && !selectedCourseId) {
      return "Please select a course for unit-based practice"
    }
    if (contentSource === 'group' && !selectedGroupId) {
      return "Please select a group for group-based practice"
    }

    // Check practice options
    if (flashcardType === 'word') {
      const hasAskOption = Object.values(wordOptions).slice(5).some(Boolean)
      const hasShowOption = Object.values(wordOptions).slice(0, 5).some(Boolean)
      if (!hasAskOption) return "Please select at least one option to ask for"
      if (!hasShowOption) return "Please select at least one option to show"
    } else {
      const hasAskOption = Object.values(kanjiOptions).slice(4).some(Boolean)
      const hasShowOption = Object.values(kanjiOptions).slice(0, 4).some(Boolean)
      if (!hasAskOption) return "Please select at least one option to ask for"
      if (!hasShowOption) return "Please select at least one option to show"
    }

    return null
  }

  const startSession = async () => {
    const error = validateConfiguration()
    if (error) {
      alert(error)
      return
    }

    setIsLoading(true)
    try {
      const config: FlashcardConfig = {
        flashcard_type: flashcardType,
        content_source: contentSource,
        course_id: selectedCourseId || undefined,
        unit_id: selectedUnitId || undefined,
        group_id: selectedGroupId || undefined,
        word_options: flashcardType === 'word' ? wordOptions : undefined,
        kanji_options: flashcardType === 'kanji' ? kanjiOptions : undefined,
        filters,
        card_count: cardCount,
        time_limit: timeLimit || undefined,
        shuffle_options: shuffleOptions,
      }

      const newSession = await flashcardsV2Api.start(config)
      setSession(newSession)
      setCards(newSession.cards)
      setCurrentIndex(0)
      setSelectedOption(null)
      setIsCorrect(null)
      setAnswers([])
      setShowConfig(false)
      setShowResults(false)
    } catch (error) {
      console.error("Failed to start session:", error)
      alert("Failed to start flashcard session. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOptionSelect = (optionIndex: number) => {
    if (selectedOption !== null || !session) return

    setSelectedOption(optionIndex)
    const correct = optionIndex === cards[currentIndex].correct_index
    setIsCorrect(correct)

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

    setIsLoading(true)
    try {
      const submission: FlashcardSubmission = {
        session_id: session.id,
        answers: finalAnswers,
      }
      const result = await flashcardsV2Api.submit(submission)
      setResults(result)
      setShowResults(true)
    } catch (error) {
      console.error("Failed to submit session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetSession = () => {
    setSession(null)
    setCards([])
    setCurrentIndex(0)
    setSelectedOption(null)
    setIsCorrect(null)
    setAnswers([])
    setShowConfig(true)
    setShowResults(false)
    setResults(null)
  }

  const currentCard = cards[currentIndex]

  if (showResults && results) {
    return (
      <div className="space-y-6">
        <Card className="glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Session Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-green-500">
                {Math.round(results.percentage)}%
              </div>
              <div className="text-lg text-muted-foreground">
                {results.correct_count} correct out of {results.total}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-500">{results.correct_count}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-500">{results.wrong_count}</div>
                <div className="text-sm text-muted-foreground">Wrong</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{Math.floor(results.duration / 60)}m {results.duration % 60}s</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={startSession} className="flex-1" disabled={isLoading}>
                <Play className="w-4 h-4 mr-2" />
                Study Again
              </Button>
              <Button onClick={resetSession} variant="outline" className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                New Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!showConfig && session && currentCard) {
    return (
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <span>{Math.round(((currentIndex) / cards.length) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
            />
          </div>
        </div>

        <Card className="glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="space-y-2">
              <Badge variant="secondary" className="mb-2">
                {flashcardType === 'word' ? 'Word' : 'Kanji'} Study
              </Badge>
              <div className="space-y-4">
                {/* Question Content */}
                <div className="p-6 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    {currentCard.question.kana && (
                      <div className="text-2xl font-bold">{currentCard.question.kana}</div>
                    )}
                    {currentCard.question.kanji && (
                      <div className="text-3xl font-bold">{currentCard.question.kanji}</div>
                    )}
                    {currentCard.question.character && (
                      <div className="text-4xl font-bold">{currentCard.question.character}</div>
                    )}
                    {currentCard.question.romaji && (
                      <div className="text-lg text-muted-foreground">{currentCard.question.romaji}</div>
                    )}
                    {currentCard.question.onyomi && (
                      <div className="text-lg">On: {currentCard.question.onyomi}</div>
                    )}
                    {currentCard.question.kunyomi && (
                      <div className="text-lg">Kun: {currentCard.question.kunyomi}</div>
                    )}
                    {currentCard.question.english && (
                      <div className="text-lg">{currentCard.question.english}</div>
                    )}
                    {currentCard.question.part_of_speech && (
                      <Badge variant="outline">{currentCard.question.part_of_speech}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center text-lg font-medium text-muted-foreground mb-4">
              Choose the correct answer:
            </div>

            <div className="grid gap-3">
              {currentCard.options.map((option, index) => {
                let buttonClass = "h-auto p-4 text-left justify-start"
                let icon = null

                if (selectedOption !== null) {
                  if (index === currentCard.correct_index) {
                    buttonClass += " bg-green-100 hover:bg-green-100 border-green-500 text-green-800"
                    icon = <Check className="w-4 h-4 text-green-500" />
                  } else if (index === selectedOption) {
                    buttonClass += " bg-red-100 hover:bg-red-100 border-red-500 text-red-800"
                    icon = <X className="w-4 h-4 text-red-500" />
                  }
                }

                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={buttonClass}
                    onClick={() => handleOptionSelect(index)}
                    disabled={selectedOption !== null}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="space-y-1">
                        {option.kana && <div className="font-bold">{option.kana}</div>}
                        {option.kanji && <div className="text-lg font-bold">{option.kanji}</div>}
                        {option.character && <div className="text-xl font-bold">{option.character}</div>}
                        {option.romaji && <div className="text-sm text-muted-foreground">{option.romaji}</div>}
                        {option.onyomi && <div>On: {option.onyomi}</div>}
                        {option.kunyomi && <div>Kun: {option.kunyomi}</div>}
                        {option.english && <div>{option.english}</div>}
                        {option.meanings && <div>{option.meanings}</div>}
                        {option.part_of_speech && <Badge variant="outline" className="mt-1">{option.part_of_speech}</Badge>}
                      </div>
                      {icon}
                    </div>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Configure Flashcard Study
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={flashcardType} onValueChange={(value: any) => setFlashcardType(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="word">Word Study</TabsTrigger>
              <TabsTrigger value="kanji">Kanji Study</TabsTrigger>
            </TabsList>

            <TabsContent value="word" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">Content Source</Label>
                <Select value={contentSource} onValueChange={(value: any) => setContentSource(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jlpt">JLPT Level</SelectItem>
                    <SelectItem value="unit">Course Unit</SelectItem>
                    <SelectItem value="group">Word Group</SelectItem>
                    <SelectItem value="srs">SRS Due Items</SelectItem>
                  </SelectContent>
                </Select>

                {contentSource === 'unit' && (
                  <div className="space-y-3">
                    <Label>Course</Label>
                    <Select value={selectedCourseId?.toString()} onValueChange={(value) => setSelectedCourseId(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.name} (Level {course.level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedCourseId && (
                      <>
                        <Label>Unit (Optional)</Label>
                        <Select value={selectedUnitId?.toString() || ""} onValueChange={(value) => setSelectedUnitId(value ? Number(value) : null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="All units (or select specific)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All units</SelectItem>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id.toString()}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                )}

                {contentSource === 'jlpt' && (
                  <div className="space-y-3">
                    <Label>JLPT Levels</Label>
                    <div className="flex gap-2">
                      {[5, 4, 3, 2, 1].map((level) => (
                        <Button
                          key={level}
                          variant={filters.jlpt_levels.includes(level) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setFilters(prev => ({
                              ...prev,
                              jlpt_levels: prev.jlpt_levels.includes(level)
                                ? prev.jlpt_levels.filter(l => l !== level)
                                : [...prev.jlpt_levels, level]
                            }))
                          }}
                        >
                          N{level}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-medium">What to Show</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.show_kana}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, show_kana: checked }))}
                      />
                      <Label>Kana (ひらがな/カタカナ)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.show_kanji}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, show_kanji: checked }))}
                      />
                      <Label>Kanji (漢字)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.show_romaji}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, show_romaji: checked }))}
                      />
                      <Label>Romaji</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.show_english}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, show_english: checked }))}
                      />
                      <Label>English</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.show_part_of_speech}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, show_part_of_speech: checked }))}
                      />
                      <Label>Part of Speech</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">What to Ask For</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.ask_for_kana}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, ask_for_kana: checked }))}
                      />
                      <Label>Kana</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.ask_for_kanji}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, ask_for_kanji: checked }))}
                      />
                      <Label>Kanji</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.ask_for_romaji}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, ask_for_romaji: checked }))}
                      />
                      <Label>Romaji</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.ask_for_english}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, ask_for_english: checked }))}
                      />
                      <Label>English</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={wordOptions.ask_for_part_of_speech}
                        onCheckedChange={(checked) => setWordOptions(prev => ({ ...prev, ask_for_part_of_speech: checked }))}
                      />
                      <Label>Part of Speech</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="kanji" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">Content Source</Label>
                <Select value={contentSource} onValueChange={(value: any) => setContentSource(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jlpt">JLPT Level</SelectItem>
                    <SelectItem value="unit">Course Unit</SelectItem>
                    <SelectItem value="srs">SRS Due Items</SelectItem>
                  </SelectContent>
                </Select>

                {contentSource === 'jlpt' && (
                  <div className="space-y-3">
                    <Label>JLPT Levels</Label>
                    <div className="flex gap-2">
                      {[5, 4, 3, 2, 1].map((level) => (
                        <Button
                          key={level}
                          variant={filters.jlpt_levels.includes(level) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setFilters(prev => ({
                              ...prev,
                              jlpt_levels: prev.jlpt_levels.includes(level)
                                ? prev.jlpt_levels.filter(l => l !== level)
                                : [...prev.jlpt_levels, level]
                            }))
                          }}
                        >
                          N{level}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-medium">What to Show</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={kanjiOptions.show_character}
                        onCheckedChange={(checked) => setKanjiOptions(prev => ({ ...prev, show_character: checked }))}
                      />
                      <Label>Character (漢字)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={kanjiOptions.show_onyomi}
                        onCheckedChange={(checked) => setKanjiOptions(prev => ({ ...prev, show_onyomi: checked }))}
                      />
                      <Label>Onyomi (音読み)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={kanjiOptions.show_kunyomi}
                        onCheckedChange={(checked) => setKanjiOptions(prev => ({ ...prev, show_kunyomi: checked }))}
                      />
                      <Label>Kunyomi (訓読み)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={kanjiOptions.show_english}
                        onCheckedChange={(checked) => setKanjiOptions(prev => ({ ...prev, show_english: checked }))}
                      />
                      <Label>English Meaning</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">What to Ask For</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={kanjiOptions.ask_for_character}
                        onCheckedChange={(checked) => setKanjiOptions(prev => ({ ...prev, ask_for_character: checked }))}
                      />
                      <Label>Character</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={kanjiOptions.ask_for_onyomi}
                        onCheckedChange={(checked) => setKanjiOptions(prev => ({ ...prev, ask_for_onyomi: checked }))}
                      />
                      <Label>Onyomi</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={kanjiOptions.ask_for_kunyomi}
                        onCheckedChange={(checked) => setKanjiOptions(prev => ({ ...prev, ask_for_kunyomi: checked }))}
                      />
                      <Label>Kunyomi</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={kanjiOptions.ask_for_english}
                        onCheckedChange={(checked) => setKanjiOptions(prev => ({ ...prev, ask_for_english: checked }))}
                      />
                      <Label>English</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-medium">Session Settings</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Cards</Label>
                <Select value={cardCount.toString()} onValueChange={(value) => setCardCount(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30, 50].map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} cards
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time Limit per Card</Label>
                <Select value={timeLimit?.toString() || ""} onValueChange={(value) => setTimeLimit(value ? Number(value) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No limit</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="20">20 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={shuffleOptions}
                onCheckedChange={setShuffleOptions}
              />
              <Label>Shuffle answer options</Label>
            </div>
          </div>

          <Button onClick={startSession} className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Starting...
              </div>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Flashcard Session
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
