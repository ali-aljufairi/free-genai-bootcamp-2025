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
  Unit,
  GrammarQuizConfig,
  GrammarQuizSession,
  GrammarSubmission,
  GrammarResult,
  ChatSession,
  SaveChatSessionRequest,
  SaveSkillAssessmentRequest
} from "@/types/api";

import { getCachedToken } from '@/lib/token-cache';

const API_BASE_URL = '/api/langportal';

/**
 * Basic fetch wrapper with error handling
 */
async function fetchData<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // If running in browser, attach a compact Clerk session token so Next API doesn't need cookies
  if (typeof window !== 'undefined') {
    try {
      const clerk: any = (window as any).Clerk;
      const session = clerk?.session;
      if (session) {
        // Use cached token to reduce unnecessary Clerk API calls
        const token = await getCachedToken(session);
        if (token) {
          defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch {}
  }

  try {
    const response = await fetch(url, {
      ...options,
      // Prevent sending cookies to Next.js API (avoids 431 due to large Clerk cookies)
      credentials: 'omit',
      cache: 'no-store',
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

// Word API calls (via unified /api/langportal proxy)
export const wordApi = {
  getWords: (page: number = 1, pageSize: number = 20) => 
    fetchData<WordsResponse>(`/words?page=${page}&pageSize=${pageSize}`),
  // Optionally support search with filters
  search: (params: {
    q?: string;
    jlpt?: number;
    part_of_speech?: string;
    level?: number;
    has_kanji?: boolean;
    correct_count?: number;
    group_id?: number;
    limit?: number;
    offset?: number;
  }) => {
    const usp = new URLSearchParams()
    if (params.q) usp.set('q', params.q)
    if (params.jlpt != null) usp.set('jlpt', String(params.jlpt))
    if (params.part_of_speech) usp.set('part_of_speech', params.part_of_speech)
    if (params.level != null) usp.set('level', String(params.level))
    if (params.has_kanji != null) usp.set('has_kanji', String(params.has_kanji))
    if (params.correct_count != null) usp.set('correct_count', String(params.correct_count))
    if (params.group_id != null) usp.set('group_id', String(params.group_id))
    if (params.limit != null) usp.set('limit', String(params.limit))
    if (params.offset != null) usp.set('offset', String(params.offset))
    return fetchData<{ items: any[]; total: number }>(`/words/search?${usp.toString()}`)
  },
};

// Kanji API calls (via unified /api/langportal proxy)
export const kanjiApi = {
  search: (params: {
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
    pageSize?: number;
  }) => {
    const usp = new URLSearchParams()
    if (params.q) usp.set('q', params.q)
    if (params.jlpt != null) usp.set('jlpt', String(params.jlpt))
    if (params.strokes_min != null) usp.set('strokes_min', String(params.strokes_min))
    if (params.strokes_max != null) usp.set('strokes_max', String(params.strokes_max))
    if (params.has_svg != null) usp.set('has_svg', String(params.has_svg))
    if (params.frequency_min != null) usp.set('frequency_min', String(params.frequency_min))
    if (params.frequency_max != null) usp.set('frequency_max', String(params.frequency_max))
    if (params.onyomi != null) usp.set('onyomi', String(params.onyomi))
    if (params.kunyomi != null) usp.set('kunyomi', String(params.kunyomi))
    if (params.components) usp.set('components', params.components)
    if (params.group_id != null) usp.set('group_id', String(params.group_id))
    if (params.page != null) usp.set('page', String(params.page))
    if (params.pageSize != null) usp.set('pageSize', String(params.pageSize))
    return fetchData<{ items: any[]; total: number; page: number; pageSize: number; totalPages: number }>(`/kanji?${usp.toString()}`)
  },
};

// Groups API (via unified /api/langportal proxy)
export const groupApi = {
  getGroups: () => fetchData<any[]>('/groups'),
  createGroup: (data: { name: string; description?: string }) => fetchData<any>('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  addWord: (groupId: number, wordId: number) => fetchData<{ success: boolean }>(`/groups/${groupId}/words`, {
    method: 'POST',
    body: JSON.stringify({ word_id: wordId }),
  }),
  removeWord: (groupId: number, wordId: number) => fetchData<{ success: boolean }>(`/groups/${groupId}/words/${wordId}`, {
    method: 'DELETE',
  }),
  addKanji: (groupId: number, kanjiId: number) => fetchData<{ success: boolean }>(`/groups/${groupId}/kanji`, {
    method: 'POST',
    body: JSON.stringify({ kanji_id: kanjiId }),
  }),
  removeKanji: (groupId: number, kanjiId: number) => fetchData<{ success: boolean }>(`/groups/${groupId}/kanji/${kanjiId}`, {
    method: 'DELETE',
  }),
};

// User API (favorite group)
export const userApi = {
  setFavoriteGroup: (groupId: number) => fetchData<{ success: boolean }>(`/users/me/favorite_group`, {
    method: 'PUT',
    body: JSON.stringify({ group_id: groupId }),
  }),
};



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

    const result = await response.json();
    console.log("Raw submit API response:", result); // Debug log
    
    // Handle wrapped response from Next.js API route
    if (result.success && result.data) {
      return result.data;
    }
    
    // Handle direct response (fallback)
    return result;
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

// Grammar Quiz API using langportal proxy
export const grammarApi = {
  start: async (config: GrammarQuizConfig): Promise<GrammarQuizSession> => {
    return fetchData<GrammarQuizSession>('/grammar/start', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  submit: async (submission: GrammarSubmission): Promise<GrammarResult> => {
    return fetchData<GrammarResult>('/grammar/submit', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  },

  history: async (page: number = 1, pageSize: number = 10) => {
    return fetchData<{ sessions: GrammarQuizSession[], total: number, page: number, pageSize: number, totalPages: number }>(`/grammar/history?page=${page}&pageSize=${pageSize}`);
  },
};

// Chat API using langportal proxy
export const chatApi = {
  saveSession: async (request: SaveChatSessionRequest): Promise<{ id: number; session_id: string; created?: boolean; updated?: boolean }> => {
    return fetchData<{ id: number; session_id: string; created?: boolean; updated?: boolean }>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getHistory: async (): Promise<ChatSession[]> => {
    return fetchData<ChatSession[]>('/chat/sessions');
  },

  saveSkillAssessment: async (sessionId: string, assessment: SaveSkillAssessmentRequest): Promise<ChatSession> => {
    return fetchData<ChatSession>(`/chat/sessions/${sessionId}/assessment`, {
      method: 'POST',
      body: JSON.stringify(assessment),
    });
  },
};

export const api = {
  // dashboard: dashboardApi,
  // studySession: studySessionApi,
  group: groupApi,
  // studyActivity: studyActivityApi,
  word: wordApi,
  kanji: kanjiApi,
  user: userApi,
  flashcardsV2: flashcardsV2Api,
  grammar: grammarApi,
  chat: chatApi,
};

export default api;