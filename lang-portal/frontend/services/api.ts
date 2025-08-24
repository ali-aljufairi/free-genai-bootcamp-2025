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

// v2 Flashcards API calls (skip auth; public demo)
async function fetchV2<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_V2_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      // Avoid forwarding large auth cookies in dev which can cause 431
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({} as { message?: string }));
      const error = new Error(errorData.message || `API request failed with status ${response.status}`);
      
      // Report v2 API errors to Sentry
      Sentry.captureException(error, {
        tags: {
          location: 'api-service-v2',
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
    // Report v2 network errors to Sentry
    Sentry.captureException(error, {
      tags: {
        location: 'api-service-v2',
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

export const flashcardsV2Api = {
  start: (config: FlashcardConfig) => fetchV2<FlashcardSession>(`/flashcards/start`, {
    method: 'POST',
    body: JSON.stringify(config),
  }),
  submit: (submission: FlashcardSubmission) => fetchV2<FlashcardResult>(`/flashcards/submit`, {
    method: 'POST',
    body: JSON.stringify(submission),
  }),
  history: (page: number = 1, pageSize: number = 10) => fetchV2<{ sessions: FlashcardSession[]; total: number; page: number; pageSize: number; totalPages: number }>(`/flashcards/history?page=${page}&pageSize=${pageSize}`),
  courses: () => fetchV2<Course[]>(`/flashcards/courses`),
  units: (courseId: number) => fetchV2<Unit[]>(`/flashcards/courses/${courseId}/units`),
  partsOfSpeech: () => fetchV2<string[]>(`/flashcards/parts-of-speech`),
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