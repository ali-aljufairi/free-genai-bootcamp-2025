"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface GrammarPoint {
  id: number;
  key: string;
  base_form: string;
  level: string;
  structure?: string;
  is_learned?: boolean;
}

export interface GrammarExample {
  id: number;
  japanese: string;
  english: string;
}

export interface GrammarDetails {
  meaning?: string;
  notes?: string;
  caution?: string[];
  fun_fact?: string;
}

export interface GrammarReading {
  kanji: string;
  reading: string;
  position: number;
}

export interface GrammarPointDetail extends GrammarPoint {
  examples: GrammarExample[];
  details?: GrammarDetails;
  readings: GrammarReading[];
  is_learned?: boolean;
}

export function useGrammarList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["grammar", "list"],
    queryFn: () => api.grammar.list(),
  });

  return {
    data: data || [],
    isLoading,
    error,
  };
}

export function useGrammarDetail(id: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["grammar", "detail", id],
    queryFn: () => api.grammar.getDetail(id),
    enabled: !!id,
  });

  return {
    data,
    isLoading,
    error,
  };
}

export function useMarkGrammarAsLearned() {
  const queryClient = useQueryClient();
  
  return {
    markAsLearned: async (id: number) => {
      const result = await api.grammar.markAsLearned(id);
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["grammar", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["grammar", "list"] });
      queryClient.invalidateQueries({ queryKey: ["grammar", "recent"] });
      return result;
    },
  };
}

export default { useGrammarList, useGrammarDetail, useMarkGrammarAsLearned };

