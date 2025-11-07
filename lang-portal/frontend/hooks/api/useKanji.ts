"use client";

import { useQuery } from "@tanstack/react-query";
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
  page?: number;
}

export function useKanji(params: KanjiSearchParams = {}) {
  const page = params.page || 1;

  const { data, isLoading, error } = useQuery({
    queryKey: ["kanji", params],
    queryFn: () =>
      api.kanji.search({ ...params, page, pageSize: ITEMS_PER_PAGE }),
  });

  return {
    data: data || {
      items: [],
      total: 0,
      page: 1,
      pageSize: ITEMS_PER_PAGE,
      totalPages: 0,
    },
    isLoading,
    error,
  };
}

export default { useKanji };


