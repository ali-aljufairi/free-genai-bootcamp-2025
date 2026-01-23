"use client";

import { useState, useCallback } from "react";
import type { ContentType, VocabularyBrowserFilters } from "./api/useVocabularyBrowser";

export interface UseVocabularyBrowserStateReturn {
  filters: VocabularyBrowserFilters;
  page: number;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setContentType: (type: ContentType) => void;
  setHasKanji: (hasKanji: boolean | undefined) => void;
  togglePartOfSpeech: (pos: string) => void;
  setPartOfSpeech: (pos: string[]) => void;
  setJlpt: (jlpt: number | undefined) => void;
  setCorrectCountMin: (count: number | undefined) => void;
  setOnyomi: (onyomi: boolean | undefined) => void;
  setKunyomi: (kunyomi: boolean | undefined) => void;
  setSortBy: (sort: 'frequency' | 'default') => void;
  setGroup: (group: number | undefined) => void;
}

/**
 * Hook for managing vocabulary browser state and infinite scroll logic
 */
export function useVocabularyBrowserState(): UseVocabularyBrowserStateReturn {
  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState<ContentType>("words");
  const [hasKanji, setHasKanji] = useState<boolean | undefined>(undefined);
  const [partOfSpeech, setPartOfSpeech] = useState<string[]>([]);
  const [jlpt, setJlpt] = useState<number | undefined>(undefined);
  const [correctCountMin, setCorrectCountMin] = useState<number | undefined>(undefined);
  const [onyomi, setOnyomi] = useState<boolean | undefined>(undefined);
  const [kunyomi, setKunyomi] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'frequency' | 'default'>('default');
  const [group, setGroup] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);

  const togglePartOfSpeech = useCallback((pos: string) => {
    setPage(1);
    setPartOfSpeech(prev => {
      if (prev.includes(pos)) {
        return prev.filter(p => p !== pos);
      }
      return [...prev, pos];
    });
  }, []);

  const filters: VocabularyBrowserFilters = {
    search,
    contentType,
    hasKanji,
    partOfSpeech: partOfSpeech.length > 0 ? partOfSpeech : undefined,
    jlpt,
    correctCountMin,
    onyomi,
    kunyomi,
    sortBy,
    group,
  };

  // Wrapper functions that reset page to 1 when filters change
  const wrappedSetSearch = useCallback((value: string) => {
    setPage(1);
    setSearch(value);
  }, []);
  const wrappedSetContentType = useCallback((value: ContentType) => {
    setPage(1);
    setContentType(value);
  }, []);
  const wrappedSetHasKanji = useCallback((value: boolean | undefined) => {
    setPage(1);
    setHasKanji(value);
  }, []);
  const wrappedSetPartOfSpeech = useCallback((value: string[]) => {
    setPage(1);
    setPartOfSpeech(value);
  }, []);
  const wrappedSetJlpt = useCallback((value: number | undefined) => {
    setPage(1);
    setJlpt(value);
  }, []);
  const wrappedSetCorrectCountMin = useCallback((value: number | undefined) => {
    setPage(1);
    setCorrectCountMin(value);
  }, []);
  const wrappedSetOnyomi = useCallback((value: boolean | undefined) => {
    setPage(1);
    setOnyomi(value);
  }, []);
  const wrappedSetKunyomi = useCallback((value: boolean | undefined) => {
    setPage(1);
    setKunyomi(value);
  }, []);
  const wrappedSetSortBy = useCallback((value: 'frequency' | 'default') => {
    setPage(1);
    setSortBy(value);
  }, []);
  const wrappedSetGroup = useCallback((value: number | undefined) => {
    setPage(1);
    setGroup(value);
  }, []);

  return {
    filters: { ...filters, page },
    page,
    setPage,
    setSearch: wrappedSetSearch,
    setContentType: wrappedSetContentType,
    setHasKanji: wrappedSetHasKanji,
    togglePartOfSpeech,
    setPartOfSpeech: wrappedSetPartOfSpeech,
    setJlpt: wrappedSetJlpt,
    setCorrectCountMin: wrappedSetCorrectCountMin,
    setOnyomi: wrappedSetOnyomi,
    setKunyomi: wrappedSetKunyomi,
    setSortBy: wrappedSetSortBy,
    setGroup: wrappedSetGroup,
  };
}

