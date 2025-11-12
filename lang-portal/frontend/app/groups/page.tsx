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
import { useCreateGroup, useGroups, useUserProfile } from "@/hooks/api/useGroup"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, Plus, Search } from "lucide-react"

export default function GroupsPage() {
  const router = useRouter()
  const { data: groups, isLoading, refetch } = useGroups()
  const { createGroup, isLoading: creating } = useCreateGroup()
  const { favoriteGroupId } = useUserProfile()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

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

  const onCreate = async () => {
    if (!name.trim()) return
    await createGroup({ name: name.trim(), description: description.trim() || undefined })
    setOpen(false)
    setName("")
    setDescription("")
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
      ) : groups.length === 0 ? (
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
                    {isFavorite && (
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 shrink-0" />
                    )}
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
          })}
        </div>
      )}
    </div>
  )
}







