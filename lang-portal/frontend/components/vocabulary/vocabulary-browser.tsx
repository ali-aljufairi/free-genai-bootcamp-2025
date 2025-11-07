"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useVocabularyBrowser } from "@/hooks/api/useVocabularyBrowser";
import type { UnifiedItem } from "@/hooks/api/useVocabularyBrowser";
import { useVocabularyBrowserState } from "@/hooks/useVocabularyBrowserState";
import { useAddToGroup, useAddToFavorites } from "@/hooks/api/useVocabularyActions";
import { useGroups, useCreateGroup } from "@/hooks/api/useGroup";
import { VocabularyFilterSidebar } from "./vocabulary-filter-sidebar";
import { VocabularyGrid } from "./vocabulary-grid";
import { VocabularyImportSection } from "./vocabulary-import-section";

const getItemKey = (entry: UnifiedItem) => `${entry.kind}-${entry.item?.id ?? "unknown"}`;

const appendUniqueItems = (current: UnifiedItem[], incoming: UnifiedItem[]) => {
  if (incoming.length === 0) return current;

  const seen = new Set(current.map(getItemKey));
  const merged = [...current];

  for (const item of incoming) {
    const key = getItemKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
};

export function VocabularyBrowser() {
  const [showImport, setShowImport] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [visibleItems, setVisibleItems] = useState<UnifiedItem[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const filtersKeyRef = useRef<string | null>(null);
  const lastSyncedPageRef = useRef(0);
  const lastItemsSignatureRef = useRef<string | null>(null);
  const isRequestingMoreRef = useRef(false);

  // Browser state and filters
  const {
    filters,
    page,
    setPage,
    setSearch,
    setContentType,
    setHasKanji,
    togglePartOfSpeech,
    setPartOfSpeech,
    setJlpt,
    setCorrectCountMin,
    setOnyomi,
    setKunyomi,
    setSortBy,
    setGroup,
  } = useVocabularyBrowserState();

  // Data fetching
  const { items, isLoading, total, hasMore } = useVocabularyBrowser(filters);
  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        search: filters.search || "",
        contentType: filters.contentType,
        hasKanji: filters.hasKanji ?? null,
        partOfSpeech: filters.partOfSpeech || [],
        jlpt: filters.jlpt ?? null,
        correctCountMin: filters.correctCountMin ?? null,
        onyomi: filters.onyomi ?? null,
        kunyomi: filters.kunyomi ?? null,
        sortBy: filters.sortBy ?? "default",
        group: filters.group ?? null,
      }),
    [
      filters.search,
      filters.contentType,
      filters.hasKanji,
      filters.partOfSpeech,
      filters.jlpt,
      filters.correctCountMin,
      filters.onyomi,
      filters.kunyomi,
      filters.sortBy,
      filters.group,
    ]
  );

  // Actions
  const { addToFavorites } = useAddToFavorites();
  const addToGroupMutation = useAddToGroup();
  const { data: groups } = useGroups();
  const { createGroup, isLoading: creatingGroup } = useCreateGroup();

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
    await createGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() || undefined });
    setIsCreateOpen(false);
    setNewGroupName("");
    setNewGroupDesc("");
      // Groups will be refetched automatically via useGroups hook
    } catch (error) {
      // Error is already handled by useCreateGroup hook
    }
  };

  const handleAddToGroup = (groupId: number, itemId: number, type: "word" | "kanji") => {
    addToGroupMutation.mutate(
      { groupId, itemId, type },
      {
        onSuccess: () => {
          const groupName = (groups || []).find((g: any) => g.id === groupId)?.name;
          toast.success("Added to group", { description: groupName });
        },
      }
    );
  };

  useEffect(() => {
    if (filtersKeyRef.current !== filterSignature) {
      filtersKeyRef.current = filterSignature;
      lastSyncedPageRef.current = 0;
      lastItemsSignatureRef.current = null;
      isRequestingMoreRef.current = false;
      setVisibleItems([]);
    }
  }, [filterSignature]);

  useEffect(() => {
    if (isLoading) return;

    const itemsSignature =
      items.length > 0 ? items.map(getItemKey).join("|") : "empty";
    const alreadySynced =
      lastSyncedPageRef.current === page &&
      lastItemsSignatureRef.current === itemsSignature;

    if (alreadySynced) {
      return;
    }

    setVisibleItems((prev) =>
      page === 1 ? items : appendUniqueItems(prev, items)
    );
    lastSyncedPageRef.current = page;
    lastItemsSignatureRef.current = itemsSignature;
    isRequestingMoreRef.current = false;
  }, [items, page, isLoading]);

  const loadNextPage = useCallback(() => {
    if (!hasMore || isLoading || isRequestingMoreRef.current) return;
    isRequestingMoreRef.current = true;
    setPage(page + 1);
  }, [hasMore, isLoading, page, setPage]);

  useEffect(() => {
    if (!hasMore) {
      isRequestingMoreRef.current = false;
    }
  }, [hasMore]);

  useEffect(() => {
    if (!hasMore) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadNextPage, visibleItems.length]);

  const headerContent = (
    <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
      <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
        <VocabularyFilterSidebar
          contentType={filters.contentType}
          hasKanji={filters.hasKanji}
          partOfSpeech={filters.partOfSpeech || []}
          jlpt={filters.jlpt}
          correctCountMin={filters.correctCountMin}
          onyomi={filters.onyomi}
          kunyomi={filters.kunyomi}
          sortBy={filters.sortBy || 'default'}
          group={filters.group}
          groups={groups}
          onContentTypeChange={setContentType}
          onHasKanjiChange={setHasKanji}
          onTogglePartOfSpeech={togglePartOfSpeech}
          onSetPartOfSpeech={setPartOfSpeech}
          onJlptChange={setJlpt}
          onCorrectCountMinChange={setCorrectCountMin}
          onOnyomiChange={setOnyomi}
          onKunyomiChange={setKunyomi}
          onSortByChange={setSortBy}
          onGroupChange={setGroup}
        />
        <Input
          type="search"
          placeholder="Search vocabulary..."
          className="w-full sm:max-w-md"
          value={filters.search || ""}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
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
        <Popover open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <PopoverTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gname">Name</Label>
                <Input
                  id="gname"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. JLPT N5 Verbs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGroupName.trim()) {
                      handleCreateGroup();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gdesc">Description</Label>
                <Input
                  id="gdesc"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Optional"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGroupName.trim()) {
                      handleCreateGroup();
                    }
                  }}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || creatingGroup}
              >
                {creatingGroup ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  const resolvedTotalCount = Math.max(visibleItems.length, total ?? 0);
  const loadStatus = visibleItems.length === 0 ? null : (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-sm text-muted-foreground">
        Showing {visibleItems.length} of {resolvedTotalCount || visibleItems.length} entries
      </p>
      {hasMore ? (
        <>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className={`h-4 w-4 ${isLoading ? "animate-spin" : "opacity-0"}`} />
            <span>{isLoading ? "Loading more vocabulary..." : "Scroll to load more"}</span>
          </div>
          <div ref={loadMoreRef} className="h-10 w-full" aria-hidden="true" />
        </>
      ) : (
        <span className="text-sm text-muted-foreground">You&apos;ve reached the end of the list.</span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Desktop: Main content layout */}
      <div className="hidden md:block space-y-6">
        {headerContent}
        {showImport && <VocabularyImportSection />}
        <VocabularyGrid
          items={visibleItems}
          isLoading={isLoading}
          groups={groups}
          onAddToGroup={handleAddToGroup}
          onAddToFavorites={addToFavorites}
          searchTerm={filters.search}
        />
      </div>

      {/* Mobile: Standard layout */}
      <div className="md:hidden space-y-6">
        <div className="flex items-center gap-2">
          <VocabularyFilterSidebar
            contentType={filters.contentType}
            hasKanji={filters.hasKanji}
            partOfSpeech={filters.partOfSpeech || []}
            jlpt={filters.jlpt}
            correctCountMin={filters.correctCountMin}
            onyomi={filters.onyomi}
            kunyomi={filters.kunyomi}
            sortBy={filters.sortBy || 'default'}
            group={filters.group}
            groups={groups}
            onContentTypeChange={setContentType}
            onHasKanjiChange={setHasKanji}
            onTogglePartOfSpeech={togglePartOfSpeech}
            onSetPartOfSpeech={setPartOfSpeech}
            onJlptChange={setJlpt}
            onCorrectCountMinChange={setCorrectCountMin}
            onOnyomiChange={setOnyomi}
            onKunyomiChange={setKunyomi}
            onSortByChange={setSortBy}
            onGroupChange={setGroup}
          />
          <Input
            type="search"
            placeholder="Search vocabulary..."
            className="flex-1"
            value={filters.search || ""}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {headerContent}
        {showImport && <VocabularyImportSection />}
        <VocabularyGrid
          items={visibleItems}
          isLoading={isLoading}
          groups={groups}
          onAddToGroup={handleAddToGroup}
          onAddToFavorites={addToFavorites}
          searchTerm={filters.search}
        />
      </div>
      {loadStatus}
    </div>
  );
}
