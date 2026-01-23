"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreateGroup, useUpdateGroup, useGroups, useUserProfile, useRemoveWordFromGroup } from "@/hooks/api/useGroup"
import { useWords } from "@/hooks/api/useWord"
import { useQueryClient } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, Plus, Search, Pencil, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function GroupsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: groups, isLoading, refetch } = useGroups()
  const { createGroup, isLoading: creating } = useCreateGroup()
  const { updateGroup, isLoading: updating } = useUpdateGroup()
  const { mutateAsync: removeWordFromGroup } = useRemoveWordFromGroup()
  const { favoriteGroupId } = useUserProfile()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingGroup, setEditingGroup] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [wordSearchQuery, setWordSearchQuery] = useState("")

  // Fetch words for the group being edited
  const { data: groupWordsData } = useWords({
    group_id: editingGroup || undefined,
    useSearch: true,
  })

  // Filter words based on search query
  const filteredWords = useMemo(() => {
    if (!groupWordsData?.items) return []
    if (!wordSearchQuery.trim()) return groupWordsData.items
    
    const query = wordSearchQuery.toLowerCase().trim()
    return groupWordsData.items.filter((word: any) => {
      const kanji = word.kanji?.toLowerCase() || ""
      const kana = word.kana?.toLowerCase() || ""
      const english = word.english?.toLowerCase() || ""
      const romaji = word.romaji?.toLowerCase() || ""
      
      return kanji.includes(query) || 
             kana.includes(query) || 
             english.includes(query) || 
             romaji.includes(query)
    })
  }, [groupWordsData?.items, wordSearchQuery])

  const filteredGroups = useMemo(() => {
    if (!groups || !searchQuery.trim()) return groups || []
    const query = searchQuery.toLowerCase().trim()
    return groups.filter((g: any) => 
      g.name?.toLowerCase().includes(query) ||
      g.description?.toLowerCase().includes(query)
    )
  }, [groups, searchQuery])

  useEffect(() => {
    if (!open) {
      setName("")
      setDescription("")
    }
  }, [open])

  useEffect(() => {
    if (editingGroup === null) {
      setEditName("")
      setEditDescription("")
      setWordSearchQuery("")
    }
  }, [editingGroup])

  const onCreate = async () => {
    if (!name.trim()) return
    await createGroup({ name: name.trim(), description: description.trim() || undefined })
    setOpen(false)
    setName("")
    setDescription("")
    refetch()
  }

  const onEdit = (group: any) => {
    setEditingGroup(group.id)
    setEditName(group.name)
    setEditDescription(group.description || "")
  }

  const onSaveEdit = async () => {
    if (!editingGroup || !editName.trim()) return
    await updateGroup({ 
      groupId: editingGroup, 
      name: editName.trim(), 
      description: editDescription.trim() || undefined 
    })
    setEditingGroup(null)
    setEditName("")
    setEditDescription("")
    refetch()
  }

  const onCancelEdit = () => {
    setEditingGroup(null)
    setEditName("")
    setEditDescription("")
  }

  const handleRemoveWord = async (wordId: number) => {
    if (!editingGroup) return
    await removeWordFromGroup({ groupId: editingGroup, wordId })
    queryClient.invalidateQueries({ queryKey: ['words'] })
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">Organize vocabulary into study groups.</p>
        </div>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. JLPT N5 Verbs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim()) {
                      onCreate();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-sm font-medium">Description</Label>
                <Input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim()) {
                      onCreate();
                    }
                  }}
                />
              </div>
              <Button onClick={onCreate} disabled={!name.trim() || creating} className="w-full">
                {creating ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search bar */}
      {!isLoading && groups && groups.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search groups..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !groups || groups.length === 0 ? (
        <div className="text-sm text-muted-foreground">No groups yet. Create your first group.</div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-sm text-muted-foreground">No groups match your search.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((g: any) => {
            const isFavorite = favoriteGroupId === g.id;
            const wordCount = g.word_count ?? g.wordCount ?? 0;
            const kanjiCount = g.kanji_count ?? g.kanjiCount ?? 0;
            const totalCount = wordCount + kanjiCount;

            return (
              <Card
                key={g.id}
                className="glass-card relative cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/vocabulary?group=${g.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg flex-1">{g.name}</CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      {isFavorite && (
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(g)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {g.description && (
                    <CardDescription className="line-clamp-2">{g.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {totalCount === 0 ? (
                      "No items"
                    ) : (
                      <>
                        {wordCount > 0 && <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>}
                        {wordCount > 0 && kanjiCount > 0 && <span> • </span>}
                        {kanjiCount > 0 && <span>{kanjiCount} {kanjiCount === 1 ? 'kanji' : 'kanji'}</span>}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          }          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingGroup !== null} onOpenChange={(open) => !open && onCancelEdit()}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Group Info Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. JLPT N5 Verbs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editName.trim()) {
                      onSaveEdit();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc" className="text-sm font-medium">Description</Label>
                <Input
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editName.trim()) {
                      onSaveEdit();
                    }
                  }}
                />
              </div>
            </div>

            {/* Words in Group Section */}
            {editingGroup && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Words in Group ({filteredWords.length}{wordSearchQuery && ` of ${groupWordsData?.items?.length || 0}`})
                  </Label>
                </div>
                {groupWordsData?.items && groupWordsData.items.length > 0 ? (
                  <>
                    {/* Search input for words */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search words..."
                        className="pl-9"
                        value={wordSearchQuery}
                        onChange={(e) => setWordSearchQuery(e.target.value)}
                      />
                    </div>
                    {filteredWords.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredWords.map((word: any) => (
                      <div
                        key={word.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {word.kanji && (
                              <span className="text-base font-medium">{word.kanji}</span>
                            )}
                            {word.kana && (
                              <span className="text-sm text-muted-foreground">{word.kana}</span>
                            )}
                            {word.english && (
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                {word.english.split(',')[0]}
                              </span>
                            )}
                            {word.jlpt != null && (
                              <Badge variant="secondary">N{word.jlpt}</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => handleRemoveWord(word.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {wordSearchQuery ? "No words match your search." : "No words in this group yet. Add words from the vocabulary page."}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No words in this group yet. Add words from the vocabulary page.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end border-t pt-4">
              <Button variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button onClick={onSaveEdit} disabled={!editName.trim() || updating}>
                {updating ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}







