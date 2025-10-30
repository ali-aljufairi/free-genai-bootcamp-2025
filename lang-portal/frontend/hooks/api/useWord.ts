"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['words', params],
    queryFn: ({ pageParam = 1 }) => {
      if (params && (params.q || params.jlpt != null || params.part_of_speech || params.level != null || params.has_kanji != null)) {
        const offset = ((pageParam as number) - 1) * ITEMS_PER_PAGE
        return api.word.search({ ...params, limit: ITEMS_PER_PAGE, offset }) as any
      }
      return api.word.getWords(pageParam as number, ITEMS_PER_PAGE) as any
    },
    getNextPageParam: (lastPage) => 
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1
  });

  const items = data?.pages.flatMap(page => page.items) ?? [];

  return {
    data: {
      items,
      total: data?.pages[0]?.total ?? 0,
      page: data?.pages[data.pages.length - 1]?.page ?? 1,
      pageSize: ITEMS_PER_PAGE,
      totalPages: data?.pages[0]?.totalPages ?? 0
    },
    isLoading,
    error,
    loadMore: () => fetchNextPage(),
    hasMore: hasNextPage,
    isFetchingMore: isFetchingNextPage
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