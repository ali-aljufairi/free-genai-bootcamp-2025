"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { createApiService } from "@/services/api";
import { useApiClient } from "@/hooks/useApiClient";

const ITEMS_PER_PAGE = 20;

function useKanjiApi() {
  const apiClient = useApiClient();
  const api = useMemo(() => createApiService(apiClient), [apiClient]);
  return api.kanji;
}

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
  group_id?: number | string; // Support single ID or comma-separated IDs
  page?: number;
}

export function useKanji(params: KanjiSearchParams = {}) {
  const { isLoaded, isSignedIn } = useAuth();
  const kanjiApi = useKanjiApi();
  const isAuthReady = isLoaded && isSignedIn;
  const page = params.page || 1;

  const { data, isLoading, error } = useQuery({
    queryKey: ["kanji", params],
    queryFn: () =>
      kanjiApi.search({ ...params, page, pageSize: ITEMS_PER_PAGE }),
    enabled: isAuthReady,
  });

  return {
    data: data || {
      items: [],
      total: 0,
      page: 1,
      pageSize: ITEMS_PER_PAGE,
      totalPages: 0,
    },
    isLoading: !isLoaded || (isAuthReady && isLoading),
    error,
  };
}

export default { useKanji };

