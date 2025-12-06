"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";

interface QuizQuestion {
  grammar_point: string;
  question: string;
  choices: {
    text: string;
    is_correct: boolean;
  }[];
  explanation: string;
}

interface Quiz {
  level: string;
  questions: QuizQuestion[];
}

interface QuizResponse {
  level: string;
  num_questions: number;
  quiz: Quiz;
}

interface GenerateQuizParams {
  level: number;
  num_questions: number;
}

/**
 * Hook to generate a quiz with specific parameters
 */
export function useGenerateQuiz() {
  const apiClient = useApiClient();
  
  return useMutation({
    mutationFn: async (params: GenerateQuizParams): Promise<QuizResponse> => {
      return apiClient.post<QuizResponse>("/api/quiz-gen/quiz/generate", params, {
        headers: {
          "Accept": "application/json",
        },
      });
    },
  });
}

/**
 * Hook to fetch a quiz by ID
 */
export function useQuiz(id: string) {
  const apiClient = useApiClient();
  
  return useQuery({
    queryKey: ["quiz", id],
    queryFn: async (): Promise<QuizResponse> => {
      return apiClient.get<QuizResponse>(`/api/quiz-gen/quiz/${id}`);
    },
    enabled: !!id,
  });
}

export type { QuizResponse, QuizQuestion, Quiz, GenerateQuizParams };