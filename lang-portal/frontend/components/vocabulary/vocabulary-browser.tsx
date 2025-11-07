"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useVocabularyBrowser } from "@/hooks/api/useVocabularyBrowser";
import { useVocabularyBrowserState } from "@/hooks/useVocabularyBrowserState";
import { useAddToGroup, useAddToFavorites } from "@/hooks/api/useVocabularyActions";
import { useGroups, useCreateGroup } from "@/hooks/api/useGroup";
import { VocabularyFilterSidebar } from "./vocabulary-filter-sidebar";
import { VocabularyGrid } from "./vocabulary-grid";
import { VocabularyImportSection } from "./vocabulary-import-section";

export function VocabularyBrowser() {
  const [showImport, setShowImport] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

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
  const { items, isLoading, total, totalPages, hasMore, hasPrevious } = useVocabularyBrowser(filters);

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

  // Pagination component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <>
        <div className="flex items-center justify-center gap-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={!hasPrevious || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  disabled={isLoading}
                  className="min-w-[2.5rem]"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={!hasMore || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {totalPages > 0 && (
          <div className="text-center text-sm text-muted-foreground py-2">
            Page {page} of {totalPages} ({total} total items)
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Desktop: Main content layout */}
      <div className="hidden md:block space-y-6">
        {headerContent}
        {showImport && <VocabularyImportSection />}
        <VocabularyGrid
          items={items}
          isLoading={isLoading}
          groups={groups}
          onAddToGroup={handleAddToGroup}
          onAddToFavorites={addToFavorites}
          searchTerm={filters.search}
        />
        <PaginationControls />
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
          items={items}
          isLoading={isLoading}
          groups={groups}
          onAddToGroup={handleAddToGroup}
          onAddToFavorites={addToFavorites}
          searchTerm={filters.search}
        />
        <PaginationControls />
      </div>
    </div>
  );
}
