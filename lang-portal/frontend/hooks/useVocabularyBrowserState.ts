"use client";

import { useState, useRef } from "react";
import type { ContentType, VocabularyBrowserFilters } from "./api/useVocabularyBrowser";

export interface UseVocabularyBrowserStateReturn {
  filters: VocabularyBrowserFilters;
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
  loaderRef: React.RefObject<HTMLDivElement | null>;
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
  
  const loaderRef = useRef<HTMLDivElement>(null);

  const togglePartOfSpeech = (pos: string) => {
    setPartOfSpeech(prev => {
      if (prev.includes(pos)) {
        return prev.filter(p => p !== pos);
      }
      return [...prev, pos];
    });
  };

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

  return {
    filters,
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
    loaderRef,
  };
}

