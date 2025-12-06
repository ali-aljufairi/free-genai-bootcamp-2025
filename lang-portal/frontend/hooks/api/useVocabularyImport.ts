"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Word } from "@/types/api";
import { useApiClient } from "@/hooks/useApiClient";

interface UseVocabularyImportReturn {
  importVocabularyByTopic: (topic: string) => Promise<any>;
  isLoading: boolean;
  error: Error | null;
}

export function useVocabularyImport(): UseVocabularyImportReturn {
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  
  const vocabularyMutation = useMutation({
    mutationFn: async (topic: string): Promise<any> => {
      try {
        // Step 1: Fetch vocabulary suggestions from the vocabulary API
        const vocabData = await apiClient.post<{ vocabulary?: { words?: any[] } }>(
          "/api/vocab-importer/vocabulary",
          { topic },
          {
            headers: {
              "accept": "application/json"
            },
          }
        );
        
        const words = vocabData.vocabulary?.words || [];
        
        if (words.length === 0) {
          return { totalSuggestions: 0, successfulImports: 0, topic };
        }

        // Step 2: Send words directly to the words API
        await apiClient.post(`/api/langportal/words`, words);
        
        return {
          totalSuggestions: words.length,
          successfulImports: words.length,
          topic
        };
        
      } catch (error) {
        console.error('Error in vocabulary import:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["words"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      toast.success("Vocabulary imported successfully");
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });

  const importVocabularyByTopic = async (topic: string): Promise<any> => {
    return await vocabularyMutation.mutateAsync(topic);
  };

  return {
    importVocabularyByTopic,
    isLoading: vocabularyMutation.isPending,
    error: vocabularyMutation.error,
  };
}