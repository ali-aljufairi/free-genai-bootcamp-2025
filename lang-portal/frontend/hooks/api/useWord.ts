"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { wordApi } from "@/services/api";
import { Word, WordsResponse } from "@/types/api";

const ITEMS_PER_PAGE = 20;

/**
 * Hook to fetch all words with pagination and caching
 */
export function useWords() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['words'],
    // queryFn: ({ pageParam = 1 }) => wordApi.getWords(pageParam, ITEMS_PER_PAGE),
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
    // queryFn: () => wordApi.getWord(id),
    enabled: !!id
  });
}

/**
 * Hook to create a word
 */
export function useCreateWord() {
  const queryClient = useQueryClient();
  
  const { mutate, isPending: isLoading, error } = useMutation({
    // mutationFn: (data: Partial<Word>) => wordApi.createWord(data),
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