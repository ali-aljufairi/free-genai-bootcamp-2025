"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type { UnifiedItem } from "@/hooks/api/useVocabularyBrowser";
import { VocabularyCard } from "./vocabulary-card";

interface VocabularyGridProps {
  items: UnifiedItem[];
  isLoading: boolean;
  groups?: Array<{ id: number; name: string }>;
  onAddToGroup?: (groupId: number, itemId: number, type: 'word' | 'kanji') => void;
  onAddToFavorites?: (itemId: number, type: 'word' | 'kanji') => void;
  searchTerm?: string;
}

export function VocabularyGrid({
  items,
  isLoading,
  groups,
  onAddToGroup,
  onAddToFavorites,
  searchTerm,
}: VocabularyGridProps) {
  if (isLoading && items.length === 0) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="glass-card">
            <div className="p-6 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms." : "Try changing filters to see content."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
      {items.map((item, idx) => (
        <VocabularyCard
          key={`${item.kind}-${item.item.id}-${idx}`}
          item={item}
          groups={groups}
          onAddToGroup={onAddToGroup}
          onAddToFavorites={onAddToFavorites}
        />
      ))}
    </div>
  );
}

