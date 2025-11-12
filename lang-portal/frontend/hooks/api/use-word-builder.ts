import { useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import type {
  WordBuilderConfig,
  WordBuilderSession,
  WordBuilderRefreshRequest,
  WordBuilderRefreshResponse,
  WordBuilderResults,
  WordBuilderSubmitResponse,
} from '@/types/api'

// Start game - get kanji + pre-computed valid words
export function useStartWordBuilder() {
  return useMutation({
    mutationFn: async (config: WordBuilderConfig): Promise<WordBuilderSession> => {
      return api.wordBuilder.start(config)
    },
  })
}

// Refresh kanji pool (when stuck)
export function useRefreshKanji() {
  return useMutation({
    mutationFn: async (request: WordBuilderRefreshRequest): Promise<WordBuilderRefreshResponse> => {
      return api.wordBuilder.refresh(request)
    },
  })
}

// Submit final results
export function useSubmitWordBuilder() {
  return useMutation({
    mutationFn: async (results: WordBuilderResults): Promise<WordBuilderSubmitResponse> => {
      return api.wordBuilder.submit(results)
    },
  })
}

