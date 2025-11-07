"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

const ITEMS_PER_PAGE = 20;

export interface KanjiSearchParams {
  q?: string;
  jlpt?: number;
  strokes_min?: number;
  strokes_max?: number;
  has_svg?: boolean;
  frequency_min?: number;
  frequency_max?: number;
  onyomi?: boolean;
  kunyomi?: boolean;
  components?: string;
  group_id?: number;
}

export function useKanji(params: KanjiSearchParams = {}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["kanji", params],
    queryFn: ({ pageParam = 1 }) =>
      api.kanji.search({ ...params, page: pageParam as number, pageSize: ITEMS_PER_PAGE }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return {
    data: {
      items,
      total: data?.pages[0]?.total ?? 0,
      page: data?.pages[data.pages.length - 1]?.page ?? 1,
      pageSize: ITEMS_PER_PAGE,
      totalPages: data?.pages[0]?.totalPages ?? 0,
    },
    isLoading,
    error,
    loadMore: () => fetchNextPage(),
    hasMore: hasNextPage,
    isFetchingMore: isFetchingNextPage,
  };
}

export default { useKanji };


