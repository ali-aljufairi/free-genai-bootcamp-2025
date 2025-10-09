/**
 * API Service for Lang Portal
 * Handles all communication with the backend API
 */

import * as Sentry from '@sentry/nextjs';
import {
  StudySession,
  Word,
  Group,
  QuickStats,
  StudyProgress,
  StudyActivity,
  WordsResponse,
  FlashcardConfig,
  FlashcardSession,
  FlashcardSubmission,
  FlashcardResult,
  Course,
  Unit
} from "@/types/api";

const API_BASE_URL = '/api/langportal';
const API_V2_BASE_URL = '/api/v2';

/**
 * Basic fetch wrapper with error handling
 */
async function fetchData<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `API request failed with status ${response.status}`);
      
      // Report API errors to Sentry
      Sentry.captureException(error, {
        tags: {
          location: 'api-service',
          endpoint: endpoint,
          method: options.method || 'GET',
        },
        extra: {
          url: url,
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
        },
      });
      
      throw error;
    }

    return response.json();
  } catch (error) {
    // Report network errors to Sentry
    Sentry.captureException(error, {
      tags: {
        location: 'api-service',
        endpoint: endpoint,
        method: options.method || 'GET',
        errorType: 'network',
      },
      extra: {
        url: url,
        options: options,
      },
    });
    
    throw error;
  }
}

// TEMPORARILY DISABLED DUE TO DATABASE MIGRATION ISSUES
// Dashboard API calls
// export const dashboardApi = {
//   getLastStudySession: () => fetchData<StudySession>('/dashboard/last_study_session'),
//   getStudyProgress: () => fetchData<StudyProgress>('/dashboard/study_progress'),
//   getQuickStats: () => fetchData<QuickStats>('/dashboard/quick-stats'),
// };

// Study Session API calls
// export const studySessionApi = {
//   getStudySessions: () => fetchData<StudySession[]>('/study_sessions'),
//   getStudySession: (id: string) => fetchData<StudySession>(`/study_sessions/${id}`),
//   getStudySessionWords: (id: string) => fetchData<Word[]>(`/study_sessions/${id}/words`),
//   createStudySession: (data: Partial<StudySession>) => fetchData<StudySession>('/study_sessions', {
//     method: 'POST',
//     body: JSON.stringify(data),
//   }),
//   reviewWord: (sessionId: string, wordId: string, data: { proficiency: number }) => 
//     fetchData<{ success: boolean }>(`/study_sessions/${sessionId}/words/${wordId}/review`, {
//       method: 'POST',
//       body: JSON.stringify(data),
//     }),
// };

// Group API calls
// export const groupApi = {
//   getGroups: () => fetchData<Group[]>('/groups'),
//   getGroup: (id: string) => fetchData<Group>(`/groups/${id}`),
//   getGroupWords: (id: string) => fetchData<Word[]>(`/groups/${id}/words`),
//   getGroupStudySessions: (id: string) => fetchData<StudySession[]>(`/groups/${id}/study_sessions`),
// };

// Study Activity API calls
// export const studyActivityApi = {
//   getStudyActivities: (page: number = 1, pageSize: number = 20) => 
//     fetchData<{ items: StudyActivity[], total: number, page: number }>(`/study_activities?page=${page}&per_page=${pageSize}`),
//   getStudyActivity: (id: string) => fetchData<StudyActivity>(`/study_activities/${id}`),
//   getStudyActivitySessions: (id: string) => fetchData<StudySession[]>(`/study_activities/${id}/sessions`),
//   createStudyActivity: (data: Partial<StudyActivity>) => fetchData<StudyActivity>('/study_activities', {
//     method: 'POST',
//     body: JSON.stringify(data),
//   }),
// };

// Word API calls
// export const wordApi = {
//   getWords: (page: number = 1, pageSize: number = 20) => 
//     fetchData<WordsResponse>(`/words?page=${page}&pageSize=${pageSize}`),
//   getWord: (id: string) => fetchData<Word>(`/words/${id}`),
//   createWord: (data: Partial<Word>) => fetchData<Word>('/words', {
//     method: 'POST',
//     body: JSON.stringify(data),
//   }),
// };



// Flashcards API using Next.js API routes for proper server-side authentication
export const flashcardsV2Api = {
  start: async (config: FlashcardConfig): Promise<FlashcardSession> => {
    const response = await fetch('/api/flashcards/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Failed to start flashcard session: ${response.status}`);
    }

    const result = await response.json();
    console.log("Raw API response:", result); // Debug log
    
    // Handle wrapped response from Next.js API route
    if (result.success && result.data) {
      return result.data;
    }
    
    // Handle direct response (fallback)
    return result;
  },

  submit: async (submission: FlashcardSubmission): Promise<FlashcardResult> => {
    const response = await fetch('/api/flashcards/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Failed to submit flashcard session: ${response.status}`);
    }

    return response.json();
  },

  history: async (page: number = 1, pageSize: number = 10) => {
    const response = await fetch(`/api/flashcards/history?page=${page}&pageSize=${pageSize}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Failed to fetch flashcard history: ${response.status}`);
    }

    return response.json();
  },

  courses: async (): Promise<Course[]> => {
    const response = await fetch('/api/flashcards/courses');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Failed to fetch courses: ${response.status}`);
    }

    const result = await response.json();
    // Handle wrapped response from api-proxy
    return result.data || result;
  },

  units: async (courseId: number): Promise<Unit[]> => {
    const response = await fetch(`/api/flashcards/courses/${courseId}/units`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Failed to fetch units: ${response.status}`);
    }

    const result = await response.json();
    // Handle wrapped response from api-proxy
    return result.data || result;
  },
};

export const api = {
  // dashboard: dashboardApi,
  // studySession: studySessionApi,
  // group: groupApi,
  // studyActivity: studyActivityApi,
  // word: wordApi,
  flashcardsV2: flashcardsV2Api,
};

export default api;