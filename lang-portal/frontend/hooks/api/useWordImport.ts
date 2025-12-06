"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Word } from "@/types/api";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";

interface UseWordImportReturn {
  addWord: (wordData: Partial<Word>) => Promise<Word>;
  addMultipleWords: (words: Partial<Word>[]) => Promise<number>;
  isLoading: boolean;
  error: Error | null;
}

export function useWordImport(): UseWordImportReturn {
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  
  const mutation = useMutation({
    mutationFn: async (wordData: Partial<Word>): Promise<Word> => {
      return apiClient.post<Word>(`/api/langportal/words`, wordData);
    },
    onSuccess: () => {
      // Invalidate the words query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["words"] });
    }
  });

  // Function to add a single word
  const addWord = async (wordData: Partial<Word>): Promise<Word> => {
    try {
      const result = await mutation.mutateAsync(wordData);
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Function to add multiple words
  const addMultipleWords = async (words: Partial<Word>[]): Promise<number> => {
    let successCount = 0;
    
    for (const word of words) {
      try {
        await addWord(word);
        successCount++;
      } catch (error) {
        console.error("Error adding word:", word, error);
        // Continue with the next word even if one fails
      }
    }
    
    return successCount;
  };

  return {
    addWord,
    addMultipleWords,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}