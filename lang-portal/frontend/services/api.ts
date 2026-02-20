import {
  StudySession,
  Word,
  Group,
  QuickStats,
  StudyProgress,
  StudyActivity,
  RecentActivity,
  RecentActivitiesResponse,
  ActivityDatesResponse,
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
  ReadingQuizConfig,
  ReadingQuizSession,
  ReadingSubmission,
  ReadingResult,
  ChatSession,
  SaveChatSessionRequest,
  SaveSkillAssessmentRequest,
  WordBuilderConfig,
  WordBuilderSession,
  WordBuilderRefreshRequest,
  WordBuilderRefreshResponse,
  WordBuilderResults,
  WordBuilderSubmitResponse
} from "@/types/api";

import { ApiClient, createApiClient } from '@/lib/api-client';

const API_BASE_URL = '/api/langportal';

function endpoint(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function createApiService(client: ApiClient) {
  const dashboardApi = {
    getLastStudySession: () => client.get<StudySession>(endpoint('/dashboard/last_study_session')),
    getStudyProgress: () => client.get<StudyProgress>(endpoint('/dashboard/study_progress')),
    getQuickStats: () => client.get<QuickStats>(endpoint('/dashboard/quick-stats')),
    getActivityDates: () => client.get<ActivityDatesResponse>(endpoint('/dashboard/activity_dates'), {
      retryCount: 2,
      retryDelayMs: 300,
    }),
    getRecentActivities: (limit?: number) => 
      client.get<RecentActivitiesResponse>(endpoint(`/dashboard/recent_activities${limit ? `?limit=${limit}` : ''}`)),
  };

  const studyActivityApi = {
    getStudyActivities: (page: number = 1, pageSize: number = 20) => 
      client.get<{ items: StudyActivity[], total: number, page: number }>(
        endpoint(`/study_activities?page=${page}&per_page=${pageSize}`)
      ),
    getStudyActivity: (id: string) => client.get<StudyActivity>(endpoint(`/study_activities/${id}`)),
    getStudyActivitySessions: (id: string) => client.get<StudySession[]>(endpoint(`/study_activities/${id}/sessions`)),
    createStudyActivity: (data: Partial<StudyActivity>) => 
      client.post<StudyActivity>(endpoint('/study_activities'), data),
  };

  const wordApi = {
    getWords: (page: number = 1, pageSize: number = 20) => 
      client.get<WordsResponse>(endpoint(`/words?page=${page}&pageSize=${pageSize}`)),
    search: (params: {
      q?: string;
      jlpt?: number;
      part_of_speech?: string;
      level?: number;
      has_kanji?: boolean;
      correct_count?: number;
      group_id?: number | string;
      limit?: number;
      offset?: number;
    }) => {
      const usp = new URLSearchParams();
      if (params.q) usp.set('q', params.q);
      if (params.jlpt != null) usp.set('jlpt', String(params.jlpt));
      if (params.part_of_speech) usp.set('part_of_speech', params.part_of_speech);
      if (params.level != null) usp.set('level', String(params.level));
      if (params.has_kanji != null) usp.set('has_kanji', String(params.has_kanji));
      if (params.correct_count != null) usp.set('correct_count', String(params.correct_count));
      if (params.group_id != null) usp.set('group_id', String(params.group_id));
      if (params.limit != null) usp.set('limit', String(params.limit));
      if (params.offset != null) usp.set('offset', String(params.offset));
      return client.get<{ items: any[]; total: number }>(endpoint(`/words/search?${usp.toString()}`));
    },
  };

  const kanjiApi = {
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
      group_id?: number | string;
      page?: number;
      pageSize?: number;
    }) => {
      const usp = new URLSearchParams();
      if (params.q) usp.set('q', params.q);
      if (params.jlpt != null) usp.set('jlpt', String(params.jlpt));
      if (params.strokes_min != null) usp.set('strokes_min', String(params.strokes_min));
      if (params.strokes_max != null) usp.set('strokes_max', String(params.strokes_max));
      if (params.has_svg != null) usp.set('has_svg', String(params.has_svg));
      if (params.frequency_min != null) usp.set('frequency_min', String(params.frequency_min));
      if (params.frequency_max != null) usp.set('frequency_max', String(params.frequency_max));
      if (params.onyomi != null) usp.set('onyomi', String(params.onyomi));
      if (params.kunyomi != null) usp.set('kunyomi', String(params.kunyomi));
      if (params.components) usp.set('components', params.components);
      if (params.group_id != null) usp.set('group_id', String(params.group_id));
      if (params.page != null) usp.set('page', String(params.page));
      if (params.pageSize != null) usp.set('pageSize', String(params.pageSize));
      return client.get<{ items: any[]; total: number; page: number; pageSize: number; totalPages: number }>(
        endpoint(`/kanji?${usp.toString()}`)
      );
    },
  };

  const groupApi = {
    getGroups: () => client.get<any[]>(endpoint('/groups')),
    createGroup: (data: { name: string; description?: string }) => 
      client.post<any>(endpoint('/groups'), data),
    updateGroup: (groupId: number, data: { name: string; description?: string }) => 
      client.put<any>(endpoint(`/groups/${groupId}`), data),
    addWord: (groupId: number, wordId: number) => 
      client.post<{ success: boolean }>(endpoint(`/groups/${groupId}/words`), { word_id: wordId }),
    removeWord: (groupId: number, wordId: number) => 
      client.delete<{ success: boolean }>(endpoint(`/groups/${groupId}/words/${wordId}`)),
    addKanji: (groupId: number, kanjiId: number) => 
      client.post<{ success: boolean }>(endpoint(`/groups/${groupId}/kanji`), { kanji_id: kanjiId }),
    removeKanji: (groupId: number, kanjiId: number) => 
      client.delete<{ success: boolean }>(endpoint(`/groups/${groupId}/kanji/${kanjiId}`)),
  };

  const userApi = {
    getMe: () => client.get<any>(endpoint('/users/me')),
    setFavoriteGroup: (groupId: number | null) => 
      client.put<{ success: boolean }>(endpoint('/users/me/favorite_group'), { group_id: groupId }),
    updateUser: (userId: string, data: { display_name?: string | null; email?: string | null }) => 
      client.put<{ message: string }>(endpoint(`/users/${userId}`), data),
    getUserSettings: (userId: string) => client.get<{
      user_id: number;
      hide_english: boolean;
      ui_language: string;
      timezone: string;
      daily_review_target: number;
      current_jlpt_level: number;
    }>(endpoint(`/users/${userId}/settings`)),
    updateUserSettings: (userId: string, data: {
      hide_english?: boolean;
      ui_language?: string;
      timezone?: string;
      daily_review_target?: number;
      current_jlpt_level?: number;
    }) => client.put<{
      user_id: number;
      hide_english: boolean;
      ui_language: string;
      timezone: string;
      daily_review_target: number;
      current_jlpt_level: number;
    }>(endpoint(`/users/${userId}/settings`), data),
  };

  const flashcardsV2Api = {
    start: (config: FlashcardConfig) => 
      client.post<FlashcardSession>('/api/flashcards/start', config),
    submit: (submission: FlashcardSubmission) => 
      client.post<FlashcardResult>('/api/flashcards/submit', submission),
    history: (page: number = 1, pageSize: number = 10) => 
      client.get(`/api/flashcards/history?page=${page}&pageSize=${pageSize}`),
    courses: () => client.get<Course[]>('/api/flashcards/courses'),
    units: (courseId: number) => 
      client.get<Unit[]>(`/api/flashcards/courses/${courseId}/units`),
  };

  const grammarApi = {
    start: (config: GrammarQuizConfig) => 
      client.post<GrammarQuizSession>(endpoint('/grammar/start'), config),
    submit: (submission: GrammarSubmission) => 
      client.post<GrammarResult>(endpoint('/grammar/submit'), submission),
    history: (page: number = 1, pageSize: number = 10) => 
      client.get<{ sessions: GrammarQuizSession[], total: number, page: number, pageSize: number, totalPages: number }>(
        endpoint(`/grammar/history?page=${page}&pageSize=${pageSize}`)
      ),
    list: () => client.get<Array<{
      id: number;
      key: string;
      base_form: string;
      level: string;
      structure?: string;
      is_learned?: boolean;
    }>>(endpoint('/grammar')),
    getDetail: (id: number) => client.get<{
      id: number;
      key: string;
      base_form: string;
      level: string;
      structure?: string;
      examples: Array<{
        id: number;
        japanese: string;
        english: string;
      }>;
      details?: {
        meaning?: string;
        notes?: string;
        caution?: string[];
        fun_fact?: string;
      };
      readings: Array<{
        kanji: string;
        reading: string;
        position: number;
      }>;
    }>(endpoint(`/grammar/${id}`)),
    markAsLearned: (id: number) => 
      client.post<{ message: string; grammar_id: number }>(endpoint(`/grammar/${id}/learned`)),
  };

  const readingApi = {
    start: (config: ReadingQuizConfig) => 
      client.post<ReadingQuizSession>(endpoint('/reading/start'), config),
    submit: (submission: ReadingSubmission) => 
      client.post<ReadingResult>(endpoint('/reading/submit'), submission),
    history: (page: number = 1, pageSize: number = 10) => 
      client.get<{ sessions: ReadingQuizSession[], total: number, page: number, pageSize: number, totalPages: number }>(
        endpoint(`/reading/history?page=${page}&pageSize=${pageSize}`)
      ),
  };

  const chatApi = {
    saveSession: (request: SaveChatSessionRequest) => 
      client.post<{ id: number; session_id: string; created?: boolean; updated?: boolean }>(
        endpoint('/chat/sessions'), 
        request
      ),
    getHistory: () => client.get<ChatSession[]>(endpoint('/chat/sessions')),
    saveSkillAssessment: (sessionId: string, assessment: SaveSkillAssessmentRequest) => 
      client.post<ChatSession>(endpoint(`/chat/sessions/${sessionId}/assessment`), assessment),
  };

  const wordBuilderApi = {
    start: (config: WordBuilderConfig) => 
      client.post<WordBuilderSession>(endpoint('/word-builder/start'), config),
    refresh: (request: WordBuilderRefreshRequest) => 
      client.post<WordBuilderRefreshResponse>(endpoint('/word-builder/refresh'), request),
    submit: (results: WordBuilderResults) => 
      client.post<WordBuilderSubmitResponse>(endpoint('/word-builder/submit'), results),
  };

  const subscriptionApi = {
    getUsageCount: () =>
      client.get<{
        session_count: number;
        month_year: string;
        plan: string;
        limit: number;
        remaining: number;
      }>(endpoint('/subscription/usage')),
    checkLimit: () =>
      client.get<{
        can_start: boolean;
        reason: string;
        plan: string;
        session_count: number;
        limit: number;
        remaining: number;
      }>(endpoint('/subscription/check-limit')),
  };

  return {
    dashboard: dashboardApi,
    studyActivity: studyActivityApi,
    word: wordApi,
    kanji: kanjiApi,
    group: groupApi,
    user: userApi,
    flashcardsV2: flashcardsV2Api,
    grammar: grammarApi,
    reading: readingApi,
    chat: chatApi,
    wordBuilder: wordBuilderApi,
    subscription: subscriptionApi,
  };
}

const defaultClient = createApiClient();
const api = createApiService(defaultClient);

export { api };
export default api;

export const dashboardApi = api.dashboard;
export const studyActivityApi = api.studyActivity;
export const wordApi = api.word;
export const kanjiApi = api.kanji;
export const groupApi = api.group;
export const userApi = api.user;
export const flashcardsV2Api = api.flashcardsV2;
export const grammarApi = api.grammar;
export const readingApi = api.reading;
export const chatApi = api.chat;
export const wordBuilderApi = api.wordBuilder;
export const subscriptionApi = api.subscription;
