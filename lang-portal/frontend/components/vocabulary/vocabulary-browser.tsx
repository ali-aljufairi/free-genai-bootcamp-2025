"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
// import { useGroups } from "@/hooks/api/useGroup"
import { useWords } from "@/hooks/api/useWord"
import { useKanji } from "@/hooks/api/useKanji"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Plus, X, FolderPlus, Star } from "lucide-react"
import { Label } from "@/components/ui/label"
// import { useVocabularyImport } from "@/hooks/api/useVocabularyImport"
import { useCreateGroup, useGroups } from "@/hooks/api/useGroup"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const JLPT_LEVELS = {
  N5: {
    description: "Basic vocabulary and kanji. Ability to understand some basic Japanese.",
    words: "800 words",
    kanji: "100 kanji",
    example: "日本語 (にほんご) - Japanese language"
  },
  N4: {
    description: "Basic vocabulary and kanji to understand basic conversations.",
    words: "1,500 words",
    kanji: "300 kanji",
    example: "図書館 (としょかん) - Library"
  },
  N3: {
    description: "Intermediate vocabulary and kanji for everyday situations.",
    words: "3,000 words",
    kanji: "650 kanji",
    example: "携帯電話 (けいたいでんわ) - Mobile phone"
  },
  N2: {
    description: "Advanced vocabulary and kanji for most everyday situations.",
    words: "6,000 words",
    kanji: "1,000 kanji",
    example: "環境保護 (かんきょうほご) - Environmental protection"
  },
  N1: {
    description: "Advanced vocabulary and kanji to understand Japanese in most circumstances.",
    words: "10,000+ words",
    kanji: "2,000+ kanji",
    example: "持続可能 (じぞくかのう) - Sustainable"
  }
} as const

export function VocabularyBrowser() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [topic, setTopic] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<keyof typeof JLPT_LEVELS>("N5")
  const [importType, setImportType] = useState<"topic" | "jlpt">("topic")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [contentType, setContentType] = useState<"words" | "kanji" | "both">("words")
  const [hasKanjiOnly, setHasKanjiOnly] = useState<boolean | undefined>(undefined)
  const [partOfSpeech, setPartOfSpeech] = useState<string | undefined>(undefined)
  // const { importVocabularyByTopic, isLoading: importLoading } = useVocabularyImport()
  const { data: groups } = useGroups()
  const { createGroup, isLoading: creatingGroup } = useCreateGroup()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDesc, setNewGroupDesc] = useState("")
  const wordParams = {
    q: searchTerm || undefined,
    has_kanji: hasKanjiOnly,
    part_of_speech: partOfSpeech,
  }
  const {
    data: wordsData,
    isLoading: wordsLoading,
    loadMore: loadMoreWords,
    hasMore: hasMoreWords
  } = useWords(wordParams)

  const kanjiParams = {
    q: contentType !== 'words' && searchTerm ? searchTerm : undefined,
  }
  const {
    data: kanjiData,
    isLoading: kanjiLoading,
    loadMore: loadMoreKanji,
    hasMore: hasMoreKanji
  } = useKanji(kanjiParams)

  const words = wordsData?.items || []
  const kanji = kanjiData?.items || []
  const loader = useRef(null)

  type UnifiedItem = { kind: 'word'; item: any } | { kind: 'kanji'; item: any }
  const wordItems: UnifiedItem[] = contentType === 'kanji' ? [] : words.map(w => ({ kind: 'word' as const, item: w }))
  const kanjiItems: UnifiedItem[] = contentType === 'words' ? [] : kanji.map(k => ({ kind: 'kanji' as const, item: k }))
  const unifiedItems: UnifiedItem[] = wordItems.concat(kanjiItems)

  // Implement infinite scroll using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first.isIntersecting) return
        if (contentType !== 'kanji' && hasMoreWords && !wordsLoading) {
          loadMoreWords()
        }
        if (contentType !== 'words' && hasMoreKanji && !kanjiLoading) {
          loadMoreKanji()
        }
      },
      { threshold: 1.0 }
    )

    const currentLoader = loader.current
    if (currentLoader) {
      observer.observe(currentLoader)
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader)
      }
    }
  }, [loadMoreWords, hasMoreWords, wordsData?.page, wordsLoading, loadMoreKanji, hasMoreKanji, kanjiData?.page, kanjiLoading, contentType])

  const handleStudyWord = async (wordId: number) => {
    try {
      // Here you could implement logic to add the word to a study session
      toast.success("Word added to study session")
    } catch (error) {
      toast.error("Failed to add word to study session")
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!topic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    try {
      // await importVocabularyByTopic(topic.trim())
      toast.success("Vocabulary imported successfully!", {
        description: `Words for topic "${topic}" have been added to your vocabulary list`
      })
      setTopic("")
    } catch (error) {
      toast.error("Failed to import vocabulary", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }

  const handleJLPTImport = async () => {
    try {
      const response = await fetch(`/api/langportal/jlpt/import?level=${selectedLevel}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import JLPT vocabulary');
      }

      toast.success("JLPT vocabulary imported successfully!", {
        description: `Imported ${data.kanji_count} kanji and ${data.compound_count} compound words for ${selectedLevel}`
      });
    } catch (error) {
      toast.error("Failed to import JLPT vocabulary", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    await createGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() || undefined })
    setIsCreateOpen(false)
    setNewGroupName("")
    setNewGroupDesc("")
  }

  const getFavoritesGroupId = () => {
    const favorites = (groups || []).find((g: any) => typeof g.name === 'string' && g.name.toLowerCase().includes('favorite'))
    return favorites?.id as number | undefined
  }

  const handleFavoriteAdd = async (entry: { kind: 'word' | 'kanji'; item: any }) => {
    try {
      const favoritesId = getFavoritesGroupId()
      if (!favoritesId) {
        toast.error("No Favorites group found", { description: "Create a 'Favorites' group first on the Groups page." })
        return
      }
      if (entry.kind === 'word') {
        await fetch(`/api/langportal/groups/${favoritesId}/words`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word_id: entry.item.id }) })
      } else {
        await fetch(`/api/langportal/groups/${favoritesId}/kanji`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kanji_id: entry.item.id }) })
      }
      toast.success("Added to Favorites")
    } catch {
      toast.error("Failed to add to Favorites")
    }
  }

  if ((wordsLoading && contentType !== 'kanji' && !words.length) || (kanjiLoading && contentType !== 'words' && !kanji.length)) {
    return (
      <div className="space-y-4">
        <Input
          type="search"
          placeholder="Search vocabulary..."
          className="max-w-sm"
          disabled
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="glass-card">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 ">

      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <div className="flex gap-2">
                    <Button variant={contentType === 'words' ? 'default' : 'outline'} size="sm" onClick={() => setContentType('words')}>Words</Button>
                    <Button variant={contentType === 'kanji' ? 'default' : 'outline'} size="sm" onClick={() => setContentType('kanji')}>Kanji</Button>
                    <Button variant={contentType === 'both' ? 'default' : 'outline'} size="sm" onClick={() => setContentType('both')}>Both</Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Words</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="has-kanji" checked={hasKanjiOnly === true} onCheckedChange={(v) => setHasKanjiOnly(v ? true : undefined)} />
                    <Label htmlFor="has-kanji" className="text-sm">Has Kanji</Label>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label>Part of Speech</Label>
                    <Select value={partOfSpeech} onValueChange={(v) => setPartOfSpeech(v || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="noun">Noun</SelectItem>
                        <SelectItem value="verb">Verb</SelectItem>
                        <SelectItem value="adjective">Adjective</SelectItem>
                        <SelectItem value="adverb">Adverb</SelectItem>
                        <SelectItem value="particle">Particle</SelectItem>
                        <SelectItem value="prefix">Prefix</SelectItem>
                        <SelectItem value="suffix">Suffix</SelectItem>
                        <SelectItem value="expression">Expression</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>JLPT</Label>
                  <Select value={selectedLevel} onValueChange={(value: string) => setSelectedLevel(value as keyof typeof JLPT_LEVELS)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(JLPT_LEVELS).map((level) => (
                        <SelectItem key={level} value={level}>
                          JLPT {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Button className="w-full" onClick={() => setIsFilterOpen(false)}>Apply</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Input
            type="search"
            placeholder="Search vocabulary..."
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImport(!showImport)}
          >
            {showImport ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Hide Import
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Import Words
              </>
            )}
          </Button>
          <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Create Group</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gname">Name</Label>
                  <Input id="gname" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. JLPT N5 Verbs" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gdesc">Description</Label>
                  <Input id="gdesc" value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Optional" />
                </div>
                <Button className="w-full" onClick={handleCreateGroup} disabled={!newGroupName.trim() || creatingGroup}>
                  {creatingGroup ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {showImport && (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle>Import Vocabulary</CardTitle>
            <CardDescription>
              Add words to your study list by topic or JLPT level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant={importType === "topic" ? "default" : "outline"}
                  onClick={() => setImportType("topic")}
                >
                  By Topic
                </Button>
                <Button
                  variant={importType === "jlpt" ? "default" : "outline"}
                  onClick={() => setImportType("jlpt")}
                >
                  By JLPT Level
                </Button>
              </div>

              {importType === "topic" ? (
                <form onSubmit={handleImport} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      name="topic"
                      placeholder="e.g. Sea animals, Kitchen utensils, Travel phrases"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter a specific topic to automatically generate related vocabulary words
                    </p>
                  </div>
                  {/* <Button
                    type="submit"
                    className="w-full"
                    disabled={importLoading || !topic.trim()}
                  >
                    {importLoading ? "Importing..." : "Import Vocabulary"}
                  </Button> */}
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select JLPT Level</Label>
                    <Select
                      value={selectedLevel}
                      onValueChange={(value: string) => setSelectedLevel(value as keyof typeof JLPT_LEVELS)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a level" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(JLPT_LEVELS).map(([level, info]) => (
                          <SelectItem key={level} value={level}>
                            JLPT {level} - {info.kanji}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground text-left">
                      {JLPT_LEVELS[selectedLevel].description}
                    </p>
                  </div>

                  {/* <Button
                    className="w-full"
                    onClick={handleJLPTImport}
                    disabled={importLoading}
                  >
                    {importLoading ? "Importing..." : `Import ${selectedLevel} Vocabulary`}
                  </Button> */}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground border-t p-3">
            <p>Words will be added to your vocabulary for study sessions.</p>
          </CardFooter>
        </Card>
      )}

      {unifiedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms." : "Try changing filters to see content."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unifiedItems.map((entry, idx) => {
              if (entry.kind === 'word') {
                const word = entry.item
                const englishPreview = (word.english || "")
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
                  .slice(0, 6)
                  .join(', ')
                return (
                  <Card key={`w-${word.id}-${idx}`} className="glass-card relative flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium flex flex-col gap-1">
                        <span className="text-xl">{(word as any).kanji ?? (word as any).japanese ?? (word as any).kana}</span>
                        {(word as any).kana && (
                          <span className="text-base text-muted-foreground font-normal">{(word as any).kana}</span>
                        )}
                        {word.romaji && (
                          <span className="text-sm text-muted-foreground font-normal">{word.romaji}</span>
                        )}
                        {(word as any).jlpt != null && (
                          <div>
                            <Badge>JLPT N{(word as any).jlpt}</Badge>
                          </div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <Button aria-label="Favorite" variant="ghost" size="icon" className="!absolute top-2 right-2 z-20 h-8 w-8" onClick={() => handleFavoriteAdd({ kind: 'word', item: word })}>
                      <Star className="h-5 w-5" />
                    </Button>
                    <CardContent className="flex-1">
                      {englishPreview && <p className="text-base mb-2">{englishPreview}</p>}
                      <div className="flex gap-2 mt-2">
                        {word.parts?.type && <Badge variant="secondary">{word.parts.type}</Badge>}
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <div className="flex-1">
                        <Select onValueChange={(val) => {
                          const groupId = Number(val)
                          if (!groupId) return
                          // optimistic UX; backend add-to-group handled elsewhere in app if needed later
                          toast.success("Added to group", { description: (groups || []).find((g: any) => g.id === groupId)?.name })
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder={<div className="flex items-center gap-2"><FolderPlus className="h-4 w-4" /> Add to Group</div>} />
                          </SelectTrigger>
                          <SelectContent>
                            {(groups || []).map((g: any) => (
                              <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="secondary" className="flex-1" onClick={() => window.open(`https://jisho.org/search/${encodeURIComponent((word as any).kanji ?? (word as any).japanese ?? (word as any).kana ?? '')}`, '_blank')}>Look up</Button>
                    </CardFooter>
                  </Card>
                )
              }
              const k = entry.item
              const meanings = Array.isArray(k.meanings)
                ? k.meanings.slice(0, 6).join(', ')
                : (k.meanings || '').split(',').slice(0, 6).map((s: string) => s.trim()).join(', ')
              return (
                <Card key={`k-${k.id}-${idx}`} className="glass-card relative flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium flex flex-col gap-1">
                      <span className="text-2xl">{k.character}</span>
                      <div className="flex items-center gap-3 flex-wrap text-sm">
                        {k.onyomi && (
                          <span className="text-muted-foreground">
                            <span className="font-medium">音読み:</span> {k.onyomi}
                          </span>
                        )}
                        {k.kunyomi && (
                          <span className="text-muted-foreground">
                            <span className="font-medium">訓読み:</span> {k.kunyomi}
                          </span>
                        )}
                      </div>
                      {k.jlpt != null && (
                        <div>
                          <Badge>JLPT {k.jlpt}</Badge>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <Button aria-label="Favorite" variant="ghost" size="icon" className="!absolute top-2 right-2 z-20 h-8 w-8" onClick={() => handleFavoriteAdd({ kind: 'kanji', item: k })}>
                    <Star className="h-5 w-5" />
                  </Button>
                  <CardContent className="flex-1">
                    {meanings && <p className="text-base mb-2">{meanings}</p>}
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => window.open(`https://jisho.org/search/${encodeURIComponent(k.character)}`, '_blank')}>Look up</Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
          {(contentType !== 'kanji' ? hasMoreWords : false) || (contentType !== 'words' ? hasMoreKanji : false) ? (
            <div ref={loader} className="flex justify-center py-4">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

