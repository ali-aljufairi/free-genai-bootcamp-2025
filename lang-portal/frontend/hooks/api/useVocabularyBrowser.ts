"use client";

import { useCallback } from "react";
import { useWords } from "./useWord";
import { useKanji } from "./useKanji";

export type ContentType = "words" | "kanji" | "both";

export interface VocabularyBrowserFilters {
  search?: string;
  contentType: ContentType;
  hasKanji?: boolean;
  partOfSpeech?: string[];
  jlpt?: number;
  correctCountMin?: number;
  onyomi?: boolean;
  kunyomi?: boolean;
  sortBy?: 'frequency' | 'default';
  group?: number;
}

export type UnifiedItem = 
  | { kind: 'word'; item: any } 
  | { kind: 'kanji'; item: any };

export interface UseVocabularyBrowserReturn {
  items: UnifiedItem[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  isFetchingMore: boolean;
}

/**
 * Hook to fetch vocabulary (words and/or kanji) with React Query
 * Combines useWords and useKanji hooks based on contentType filter
 */
export function useVocabularyBrowser(filters: VocabularyBrowserFilters): UseVocabularyBrowserReturn {
  // For words, use first partOfSpeech if array (API may not support array, so we'll filter client-side)
  const partOfSpeechForAPI = filters.partOfSpeech && filters.partOfSpeech.length > 0 
    ? filters.partOfSpeech[0] 
    : undefined;

  const {
    data: wordsData,
    isLoading: wordsLoading,
    loadMore: loadMoreWords,
    hasMore: hasMoreWords,
    isFetchingMore: isFetchingMoreWords
  } = useWords({
    q: filters.search || undefined,
    has_kanji: filters.hasKanji,
    part_of_speech: partOfSpeechForAPI,
    jlpt: filters.jlpt,
    correct_count: filters.correctCountMin,
    group_id: filters.group,
  });

  const {
    data: kanjiData,
    isLoading: kanjiLoading,
    loadMore: loadMoreKanji,
    hasMore: hasMoreKanji,
    isFetchingMore: isFetchingMoreKanji
  } = useKanji({
    q: filters.contentType !== 'words' && filters.search ? filters.search : undefined,
    jlpt: filters.jlpt,
    onyomi: filters.onyomi,
    kunyomi: filters.kunyomi,
    group_id: filters.group,
  });

  let words = wordsData?.items || [];
  let kanji = kanjiData?.items || [];

  // Filter words client-side for multiple partOfSpeech if needed
  if (filters.partOfSpeech && filters.partOfSpeech.length > 1 && filters.contentType !== 'kanji') {
    words = words.filter((word: any) => 
      filters.partOfSpeech!.includes(word.part_of_speech)
    );
  }

  // Apply frequency sorting if requested
  if (filters.sortBy === 'frequency') {
    if (filters.contentType !== 'words') {
      kanji = [...kanji].sort((a: any, b: any) => {
        const freqA = a.frequency || 0;
        const freqB = b.frequency || 0;
        return freqB - freqA; // Descending order
      });
    }
    // Words don't have frequency field, so no sorting needed
  }

  // Create unified items based on contentType
  const wordItems: UnifiedItem[] = filters.contentType === 'kanji' 
    ? [] 
    : words.map(w => ({ kind: 'word' as const, item: w }));
  
  const kanjiItems: UnifiedItem[] = filters.contentType === 'words' 
    ? [] 
    : kanji.map(k => ({ kind: 'kanji' as const, item: k }));
  
  const unifiedItems: UnifiedItem[] = wordItems.concat(kanjiItems);

  // Determine loading state
  const isLoading = (filters.contentType !== 'kanji' && wordsLoading && words.length === 0) ||
                     (filters.contentType !== 'words' && kanjiLoading && kanji.length === 0);

  // Determine if there's more to load
  const hasMore = (filters.contentType !== 'kanji' && hasMoreWords) ||
                  (filters.contentType !== 'words' && hasMoreKanji);

  // Load more function - memoized to prevent unnecessary re-renders
  const loadMore = useCallback(() => {
    if (filters.contentType !== 'kanji' && hasMoreWords) {
      loadMoreWords();
    }
    if (filters.contentType !== 'words' && hasMoreKanji) {
      loadMoreKanji();
    }
  }, [filters.contentType, hasMoreWords, hasMoreKanji, loadMoreWords, loadMoreKanji]);

  const isFetchingMore = (filters.contentType !== 'kanji' && isFetchingMoreWords) ||
                         (filters.contentType !== 'words' && isFetchingMoreKanji);

  return {
    items: unifiedItems,
    isLoading,
    hasMore,
    loadMore,
    isFetchingMore,
  };
}

