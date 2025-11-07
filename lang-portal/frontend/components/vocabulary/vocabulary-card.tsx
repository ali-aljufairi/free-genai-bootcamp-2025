"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, FolderPlus } from "lucide-react";
import type { UnifiedItem } from "@/hooks/api/useVocabularyBrowser";

interface VocabularyCardProps {
  item: UnifiedItem;
  groups?: Array<{ id: number; name: string }>;
  onAddToGroup?: (groupId: number, itemId: number, type: 'word' | 'kanji') => void;
  onAddToFavorites?: (itemId: number, type: 'word' | 'kanji') => void;
}

export function VocabularyCard({ item, groups = [], onAddToGroup, onAddToFavorites }: VocabularyCardProps) {
  if (item.kind === 'word') {
    const word = item.item;
    const englishPreview = (word.english || "")
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(', ');

    return (
      <Card className="glass-card relative flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex flex-col gap-1">
            <span className="text-xl">
              {(word as any).kanji ?? (word as any).japanese ?? (word as any).kana}
            </span>
            {(word as any).kana && (
              <span className="text-base text-muted-foreground font-normal">
                {(word as any).kana}
              </span>
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
        <Button
          aria-label="Favorite"
          variant="ghost"
          size="icon"
          className="!absolute top-2 right-2 z-20 h-8 w-8"
          onClick={() => onAddToFavorites?.(word.id, 'word')}
        >
          <Star className="h-5 w-5" />
        </Button>
        <CardContent className="flex-1">
          {englishPreview && <p className="text-base mb-2">{englishPreview}</p>}
          <div className="flex gap-2 mt-2">
            {word.parts?.type && <Badge variant="secondary">{word.parts.type}</Badge>}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <div className="flex-1 min-w-0">
            <Select
              onValueChange={(val) => {
                const groupId = Number(val);
                if (!groupId || !onAddToGroup || val === "none") return;
                onAddToGroup(groupId, word.id, 'word');
              }}
            >
              <SelectTrigger className="w-full [&>span]:truncate">
                <SelectValue placeholder="Add to Group" />
              </SelectTrigger>
              <SelectContent>
                {groups.length === 0 ? (
                  <SelectItem value="none" disabled>No groups available</SelectItem>
                ) : (
                  groups.map((g: any) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="secondary"
            className="flex-1 min-w-[100px] shrink-0"
            onClick={() =>
              window.open(
                `https://jisho.org/search/${encodeURIComponent(
                  (word as any).kanji ?? (word as any).japanese ?? (word as any).kana ?? ''
                )}`,
                '_blank'
              )
            }
          >
            Look up
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Kanji card
  const kanji = item.item;
  const meanings = Array.isArray(kanji.meanings)
    ? kanji.meanings.slice(0, 6).join(', ')
    : (kanji.meanings || '')
        .split(',')
        .slice(0, 6)
        .map((s: string) => s.trim())
        .join(', ');

  return (
    <Card className="glass-card relative flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex flex-col gap-1">
          <span className="text-2xl">{kanji.character}</span>
          <div className="flex items-center gap-3 flex-wrap text-sm">
            {kanji.onyomi && (
              <span className="text-muted-foreground">
                <span className="font-medium">音読み:</span> {kanji.onyomi}
              </span>
            )}
            {kanji.kunyomi && (
              <span className="text-muted-foreground">
                <span className="font-medium">訓読み:</span> {kanji.kunyomi}
              </span>
            )}
          </div>
          {kanji.jlpt != null && (
            <div>
              <Badge>JLPT {kanji.jlpt}</Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <Button
        aria-label="Favorite"
        variant="ghost"
        size="icon"
        className="!absolute top-2 right-2 z-20 h-8 w-8"
        onClick={() => onAddToFavorites?.(kanji.id, 'kanji')}
      >
        <Star className="h-5 w-5" />
      </Button>
      <CardContent className="flex-1">
        {meanings && <p className="text-base mb-2">{meanings}</p>}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() =>
            window.open(`https://jisho.org/search/${encodeURIComponent(kanji.character)}`, '_blank')
          }
        >
          Look up
        </Button>
      </CardFooter>
    </Card>
  );
}

