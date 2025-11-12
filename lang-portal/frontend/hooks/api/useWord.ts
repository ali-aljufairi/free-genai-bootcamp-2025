"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Word, WordsResponse } from "@/types/api";

const ITEMS_PER_PAGE = 20;

/**
 * Hook to fetch all words with pagination and caching
 */
export function useWords(params?: {
  q?: string;
  jlpt?: number;
  part_of_speech?: string;
  level?: number;
  has_kanji?: boolean;
  correct_count?: number;
  group_id?: number | string; // Support single ID or comma-separated IDs
  page?: number;
  useSearch?: boolean;
}) {
  const page = params?.page || 1;
  const useSearch = params?.useSearch ?? !!(params && (params.q || params.jlpt != null || params.part_of_speech || params.level != null || params.has_kanji != null || params.correct_count != null || params.group_id != null));

  const { data, isLoading, error } = useQuery({
    queryKey: ['words', params],
    queryFn: async () => {
      if (useSearch) {
        const offset = (page - 1) * ITEMS_PER_PAGE;
        const result = await api.word.search({ ...params, limit: ITEMS_PER_PAGE, offset }) as any;
        // Calculate totalPages from total
        const totalPages = result.total ? Math.ceil(result.total / ITEMS_PER_PAGE) : 0;
        return {
          ...result,
          page,
          totalPages,
          pageSize: ITEMS_PER_PAGE,
        };
      }
      return api.word.getWords(page, ITEMS_PER_PAGE) as any;
    },
  });

  return {
    data: data || {
      items: [],
      total: 0,
      page: 1,
      pageSize: ITEMS_PER_PAGE,
      totalPages: 0
    },
    isLoading,
    error,
  };
}

/**
 * Hook to fetch a specific word
 */
export function useWord(id: string) {
  return useQuery({
    queryKey: ['word', id],
    // queryFn: () => api.word.getWord(id),
    enabled: !!id
  });
}

/**
 * Hook to create a word
 */
export function useCreateWord() {
  const queryClient = useQueryClient();
  
  const { mutate, isPending: isLoading, error } = useMutation({
    // mutationFn: (data: Partial<Word>) => api.word.createWord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
    }
  });

  return { createWord: mutate, isLoading, error };
}

export default {
  useWords,
  useWord,
  useCreateWord,
};