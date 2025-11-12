import { PartOfSpeech } from './pos-enum'

// Study Session Types
export interface StudySession {
  id: string;
  type: 'quiz' | 'flashcards' | 'free' | 'speech';
  name: string;
  description: string;
  created_at: string;
  completed_at?: string;
  progress: number;
}

// Word Types
export interface Word {
  id: number;
  japanese?: string;
  kana?: string;
  kanji?: string;
  romaji: string;
  english: string;
  parts?: {
    type: string;
    category?: string;
    formality?: string;
  };
  audio_path?: string | null;
  jlpt?: number;
  part_of_speech?: string;
}

// Group Types
export interface Group {
  id: string;
  name: string;
  description: string;
  wordCount: number;
  createdAt: string;
}

// Dashboard Types
export interface QuickStats {
  success_rate: number;
  total_study_sessions: number;
  total_active_groups: number;
  study_streak_days: number;
}

export interface StudyProgress {
  dailyProgress: number;
  currentStreak: number;
  dailyActivity: {
    date: string;
    sessionCount: number;
    wordsStudied: number;
  }[];
}

// Study Activity Types
export interface StudyActivity {
  id: string;
  type: 'flashcards' | 'quiz' | 'chat' | 'drawing' | 'agent' | 'speech';
  name: string;
  description: string;
  study_session_id: string;
  group_id: string;
  created_at: string;
  thumbnail_url?: string;
}

export interface WordsResponse {
  items: Word[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// v2 Flashcards
export type FlashcardType = 'word' | 'kanji'
export type ContentSource = 'unit' | 'group' | 'jlpt' | 'srs'

export interface WordPracticeOptions {
  show_kana: boolean
  show_kanji: boolean
  show_romaji: boolean
  show_english: boolean
  show_part_of_speech: boolean

  ask_for_kana: boolean
  ask_for_kanji: boolean
  ask_for_romaji: boolean
  ask_for_english: boolean
  ask_for_part_of_speech: boolean
}

export interface KanjiPracticeOptions {
  show_character: boolean
  show_onyomi: boolean
  show_kunyomi: boolean
  show_english: boolean

  ask_for_character: boolean
  ask_for_onyomi: boolean
  ask_for_kunyomi: boolean
  ask_for_english: boolean
}

export interface ContentFilters {
  jlpt_levels: number[]
  parts_of_speech: PartOfSpeech[]
  difficulty_levels: number[]
  has_kanji?: boolean
}

export interface FlashcardConfig {
  flashcard_type: FlashcardType
  content_source: ContentSource
  course_id?: number
  unit_id?: number
  group_id?: number
  word_options?: WordPracticeOptions
  kanji_options?: KanjiPracticeOptions
  filters: ContentFilters
  card_count: number
  time_limit?: number
  shuffle_options: boolean
  required_correct_count?: number
}

export interface FlashcardContent {
  kana?: string
  kanji?: string
  romaji?: string
  english?: string
  part_of_speech?: string

  character?: string
  onyomi?: string
  kunyomi?: string
  meanings?: string
}

export interface Flashcard {
  id: number
  type: FlashcardType
  question: FlashcardContent
  answer: FlashcardContent
  options: FlashcardContent[]
  correct_index: number
  item_id: number
  item_type: string
  audio_path?: string | null
}

export interface FlashcardSession {
  id: number
  user_id: number
  config: FlashcardConfig
  cards: Flashcard[]
  started_at: string
  ended_at?: string
  score?: number
  total: number
}

export interface FlashcardAnswer { card_id: number; answer: number }

export interface FlashcardSubmission {
  session_id: number
  answers: FlashcardAnswer[]
}

export interface CardResult {
  card_id: number
  item_id: number
  item_type: string
  user_answer: number
  correct_index: number
  is_correct: boolean
}

export interface FlashcardResult {
  session_id: number
  score: number
  total: number
  percentage: number
  correct_count: number
  wrong_count: number
  duration: number
  results: CardResult[]
}

export interface Course { id: number; name: string; level: number }
export interface Unit { id: number; name: string; path: string; title?: string }

// Kanji Types
export interface Kanji {
  id: number;
  character: string;
  heisig_en?: string;
  meanings: string[];
  detail?: string;
  unicode: string;
  onyomi?: string;
  kunyomi?: string;
  jlpt?: number;
  frequency?: number;
  components?: string;
  stroke_count?: number;
  strokes_svg?: string;
  audio_path?: string | null;
}

// Grammar Quiz Types
export type GrammarQuestionType = 'grammar_choice' | 'passage_grammar' | 'sentence_composition' | 'all'

export interface GrammarQuizConfig {
  level: number
  question_type: GrammarQuestionType
  use_srs: boolean // If true, only show questions that need review (due items)
  question_count: number
  time_limit?: number
  shuffle_options: boolean
  required_correct_count?: number
}

export interface GrammarQuestion {
  id: number
  question_id: number
  question_type: string
  question_text: string
  answers: string[]
  correct_index: number
  explanation?: string | null
  level: number
}

export interface GrammarQuizSession {
  id: number
  user_id: number
  config: GrammarQuizConfig
  questions: GrammarQuestion[]
  started_at: string
  ended_at?: string
  score?: number
  total: number
}

export interface GrammarAnswer {
  question_id: number
  answer: number
}

export interface GrammarSubmission {
  session_id: number
  answers: GrammarAnswer[]
}

export interface QuestionResult {
  question_id: number
  item_id: number
  item_type: string
  user_answer: number
  correct_index: number
  is_correct: boolean
}

export interface GrammarResult {
  session_id: number
  score: number
  total: number
  percentage: number
  correct_count: number
  wrong_count: number
  duration: number
  results: QuestionResult[]
}

// Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

export interface SkillAssessment {
  estimated_jlpt_level?: number
  strengths?: string[]
  areas_for_improvement?: string[]
  vocabulary_usage?: {
    level: string
    diversity: string
  }
  grammar_accuracy?: {
    score: number
    feedback: string
  }
  assessed_at?: string
}

export interface ChatSession {
  id: number
  user_id: number
  session_id: string
  messages: ChatMessage[]
  skill_summary?: SkillAssessment | null
  model_used: string
  prompt_used: string
  created_at: string
  updated_at: string
}

export interface SaveChatSessionRequest {
  session_id: string
  messages: ChatMessage[]
  model_used: string
  prompt_used: string
}

export interface SaveSkillAssessmentRequest {
  skill_summary: SkillAssessment
}

// Word Builder Types
export interface WordBuilderConfig {
  jlpt_level: number
  time_limit: number // in seconds
}

export interface WordBuilderValidWord {
  kanji: string
  kana: string
  english: string
  word_id: number
  kanji_ids: number[] // IDs of kanji used in order
}

export interface WordBuilderSession {
  session_id: number
  kanji: Kanji[]
  valid_words: WordBuilderValidWord[]
  time_limit: number
}

export interface WordBuilderRefreshRequest {
  session_id: number
  jlpt_level: number
  used_kanji_ids: number[]
}

export interface WordBuilderRefreshResponse {
  kanji: Kanji[]
  valid_words: WordBuilderValidWord[]
}

export interface WordBuilderResults {
  session_id: number
  formed_words: string[] // Array of kanji strings like ["日本", "本日"]
  total_attempts: number
  time_spent: number // in seconds
  refresh_count: number
}

export interface WordBuilderSubmitResponse {
  session_id: number
  words_formed: number
  accuracy: number
  time_spent: number
}