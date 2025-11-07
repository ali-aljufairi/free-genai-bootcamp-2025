"use client";

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
  page?: number;
}

export type UnifiedItem = 
  | { kind: 'word'; item: any } 
  | { kind: 'kanji'; item: any };

export interface UseVocabularyBrowserReturn {
  items: UnifiedItem[];
  isLoading: boolean;
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

/**
 * Hook to fetch vocabulary (words and/or kanji) with React Query
 * Combines useWords and useKanji hooks based on contentType filter
 */
export function useVocabularyBrowser(filters: VocabularyBrowserFilters): UseVocabularyBrowserReturn {
  const currentPage = filters.page || 1;
  
  // For words, use first partOfSpeech if array (API may not support array, so we'll filter client-side)
  const partOfSpeechForAPI = filters.partOfSpeech && filters.partOfSpeech.length > 0 
    ? filters.partOfSpeech[0] 
    : undefined;

  // Always use backend search endpoint when there are any filters or search term
  const hasFilters = !!(filters.search || filters.jlpt != null || filters.hasKanji != null || 
    partOfSpeechForAPI || filters.correctCountMin != null || filters.group != null);

  const {
    data: wordsData,
    isLoading: wordsLoading,
  } = useWords({
    q: filters.search || undefined,
    has_kanji: filters.hasKanji,
    part_of_speech: partOfSpeechForAPI,
    jlpt: filters.jlpt,
    correct_count: filters.correctCountMin,
    group_id: filters.group,
    page: currentPage,
    useSearch: hasFilters, // Always use search endpoint when filters are present
  });

  const {
    data: kanjiData,
    isLoading: kanjiLoading,
  } = useKanji({
    q: filters.contentType !== 'words' && filters.search ? filters.search : undefined,
    jlpt: filters.jlpt,
    onyomi: filters.onyomi,
    kunyomi: filters.kunyomi,
    group_id: filters.group,
    page: currentPage,
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

  // Get pagination info
  const wordsTotal = wordsData?.total || 0;
  const wordsTotalPages = wordsData?.totalPages || 0;
  const kanjiTotal = kanjiData?.total || 0;
  const kanjiTotalPages = kanjiData?.totalPages || 0;

  // For combined view, use the maximum totals
  const total = filters.contentType === 'words' 
    ? wordsTotal 
    : filters.contentType === 'kanji'
    ? kanjiTotal
    : Math.max(wordsTotal, kanjiTotal);

  const totalPages = filters.contentType === 'words'
    ? wordsTotalPages
    : filters.contentType === 'kanji'
    ? kanjiTotalPages
    : Math.max(wordsTotalPages, kanjiTotalPages);

  const hasMore = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  return {
    items: unifiedItems,
    isLoading,
    total,
    page: currentPage,
    totalPages,
    hasMore,
    hasPrevious,
  };
}

