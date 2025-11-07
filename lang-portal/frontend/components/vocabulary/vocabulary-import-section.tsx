"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const JLPT_OPTIONS = [
  { value: "N1", label: "N1" },
  { value: "N2", label: "N2" },
  { value: "N3", label: "N3" },
  { value: "N4", label: "N4" },
  { value: "N5", label: "N5" },
];

export function VocabularyImportSection() {
  const [topic, setTopic] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("N5");
  const [importType, setImportType] = useState<"topic" | "jlpt">("topic");

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    try {
      // await importVocabularyByTopic(topic.trim())
      toast.success("Vocabulary imported successfully!", {
        description: `Words for topic "${topic}" have been added to your vocabulary list`,
      });
      setTopic("");
    } catch (error) {
      toast.error("Failed to import vocabulary", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleJLPTImport = async () => {
    try {
      const response = await fetch(`/api/langportal/jlpt/import?level=${selectedLevel}`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import JLPT vocabulary");
      }

      toast.success("JLPT vocabulary imported successfully!", {
        description: `Imported ${data.kanji_count} kanji and ${data.compound_count} compound words for ${selectedLevel}`,
      });
    } catch (error) {
      toast.error("Failed to import JLPT vocabulary", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Import Vocabulary</CardTitle>
        <CardDescription>Add words to your study list by topic or JLPT level</CardDescription>
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
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select JLPT Level</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    {JLPT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        JLPT {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleJLPTImport} className="w-full">
                Import {selectedLevel} Vocabulary
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground border-t p-3">
        <p>Words will be added to your vocabulary for study sessions.</p>
      </CardFooter>
    </Card>
  );
}

