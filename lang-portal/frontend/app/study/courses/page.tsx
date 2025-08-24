"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { flashcardsV2Api } from "@/services/api"
import type { Course, Unit, Flashcard, FlashcardConfig, FlashcardSession } from "@/types/api"

export default function StudyCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [courseId, setCourseId] = useState<number | null>(null)
    const [unitId, setUnitId] = useState<number | null>(null)
    const [session, setSession] = useState<FlashcardSession | null>(null)
    const [cards, setCards] = useState<Flashcard[]>([])
    const [idx, setIdx] = useState(0)
    const [sel, setSel] = useState<number | null>(null)
    const [count, setCount] = useState<number>(10)

    useEffect(() => {
        flashcardsV2Api.courses().then(setCourses).catch(() => setCourses([]))
    }, [])

    useEffect(() => {
        if (courseId != null) {
            flashcardsV2Api.units(courseId).then(setUnits).catch(() => setUnits([]))
        } else {
            setUnits([])
        }
    }, [courseId])

    async function start() {
        if (!courseId) return
        const config: FlashcardConfig = {
            flashcard_type: 'word',
            content_source: 'unit',
            course_id: courseId,
            unit_id: unitId ?? undefined,
            filters: { jlpt_levels: [], parts_of_speech: [], difficulty_levels: [], has_kanji: undefined },
            word_options: {
                show_kana: true,
                show_kanji: true,
                show_romaji: false,
                show_english: false,
                show_part_of_speech: false,
                ask_for_kana: false,
                ask_for_kanji: false,
                ask_for_romaji: false,
                ask_for_english: true,
                ask_for_part_of_speech: false,
            },
            kanji_options: undefined,
            card_count: count,
            time_limit: undefined,
            shuffle_options: true,
        }
        const s = await flashcardsV2Api.start(config)
        setSession(s)
        setCards(s.cards)
        setIdx(0)
        setSel(null)
    }

    if (!session) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Course</p>
                            <Select value={courseId?.toString()} onValueChange={(v) => setCourseId(parseInt(v))}>
                                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                                <SelectContent>
                                    {courses.map(c => (<SelectItem key={c.id} value={c.id.toString()}>{c.name} (N{c.level})</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Unit (optional)</p>
                            <Select value={unitId?.toString()} onValueChange={(v) => setUnitId(parseInt(v))}>
                                <SelectTrigger><SelectValue placeholder="All units" /></SelectTrigger>
                                <SelectContent>
                                    {units.map(u => (<SelectItem key={u.id} value={u.id.toString()}>{u.path} — {u.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Card count</p>
                            <Select value={count.toString()} onValueChange={(v) => setCount(parseInt(v))}>
                                <SelectTrigger><SelectValue placeholder="10" /></SelectTrigger>
                                <SelectContent>
                                    {[5, 10, 15, 20].map(n => (<SelectItem key={n} value={n.toString()}>{n}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={start} disabled={!courseId}>Start</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const card = cards[idx]
    function choose(i: number) {
        if (sel !== null) return
        setSel(i)
        setTimeout(() => {
            if (idx < cards.length - 1) { setIdx(x => x + 1); setSel(null) }
        }, 250)
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Card>
                <CardContent className="p-8 space-y-8">
                    <div className="text-center">
                        {card.question.kanji && <div className="text-5xl font-bold">{card.question.kanji}</div>}
                        {card.question.kana && <div className="text-xl text-muted-foreground mt-2">{card.question.kana}</div>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {card.options.map((opt, i) => (
                            <Button key={i} variant="outline" onClick={() => choose(i)}
                                className={sel === null ? '' : i === card.correct_index ? 'bg-green-500 text-white' : sel === i ? 'bg-red-500 text-white' : 'opacity-70'}>
                                {opt.english || opt.kana || opt.romaji || opt.kanji}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}



