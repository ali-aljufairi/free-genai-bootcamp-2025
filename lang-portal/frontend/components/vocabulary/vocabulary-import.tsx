"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
// import { useVocabularyImport } from "@/hooks/api/useVocabularyImport"

export function VocabularyImport() {
  const [topic, setTopic] = useState("")
  // const { importVocabularyByTopic, isLoading } = useVocabularyImport()

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Vocabulary by Topic</CardTitle>
        <CardDescription>
          Instantly add words related to a specific topic to your study list
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleImport} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              name="topic"
              placeholder="e.g. Sea animals, Kitchen utensils, Travel phrases"
              value={topic}
              onChange={handleTopicChange}
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter a specific topic to automatically generate related vocabulary words
            </p>
          </div>
          {/* <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !topic.trim()}
          >
            {isLoading ? "Importing..." : "Import Vocabulary"}
          </Button> */}
        </form>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-4 text-xs text-muted-foreground">
        <p>Words will be added to your vocabulary for study sessions.</p>
      </CardFooter>
    </Card>
  )
}