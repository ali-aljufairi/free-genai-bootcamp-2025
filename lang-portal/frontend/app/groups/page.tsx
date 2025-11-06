"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useCreateGroup, useGroups } from "@/hooks/api/useGroup"
import { Skeleton } from "@/components/ui/skeleton"

export default function GroupsPage() {
  const { data: groups, isLoading, refetch } = useGroups()
  const { createGroup, isLoading: creating } = useCreateGroup()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

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
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">Organize vocabulary into study groups.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. JLPT N5 Verbs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
              </div>
              <Button onClick={onCreate} disabled={!name.trim() || creating} className="w-full">
                {creating ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g: any) => (
            <Card key={g.id} className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">{g.name}</CardTitle>
                {g.description && (
                  <CardDescription className="line-clamp-2">{g.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">{g.wordCount ?? 0} words</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}



