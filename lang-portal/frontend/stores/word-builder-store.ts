import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Kanji, WordBuilderValidWord } from '@/types/api'

export interface WordBuilderPreferences {
  jlpt_level: number
  time_limit: number // in seconds
  show_hints: boolean // Show kanji meanings/readings as hints
  auto_validate: boolean // Automatically validate when slots are filled
  auto_clear_on_success: boolean // Automatically clear slots after successful word
}

interface WordBuilderStore {
  // Session data (from API)
  sessionId: number | null
  kanjiPool: Kanji[]
  validWords: WordBuilderValidWord[]
  timeLimit: number
  
  // Game state
  currentSlots: (Kanji | null)[] // [kanji1, kanji2, null, null] - max 4 slots
  formedWords: WordBuilderValidWord[]
  usedKanjiIds: Set<number>
  
  // Statistics
  totalAttempts: number
  successfulWords: number
  refreshCount: number
  
  // Timer
  timeRemaining: number
  isPlaying: boolean
  startTime: number | null
  
  // Preferences (persisted)
  preferences: WordBuilderPreferences
  
  // Actions
  setPreferences: (prefs: WordBuilderPreferences) => void
  initSession: (sessionId: number, kanji: Kanji[], validWords: WordBuilderValidWord[], timeLimit: number) => void
  placeKanjiInSlot: (kanji: Kanji, slotIndex: number) => void
  removeKanjiFromSlot: (slotIndex: number) => void
  swapSlots: (fromIndex: number, toIndex: number) => void
  clearSlots: () => void
  validateCurrentWord: () => WordBuilderValidWord | null
  addFormedWord: (word: WordBuilderValidWord) => void
  incrementAttempts: () => void
  refreshKanji: (kanji: Kanji[], validWords: WordBuilderValidWord[]) => void
  startTimer: () => void
  updateTimer: (remaining: number) => void
  stopTimer: () => void
  resetGame: () => void
}

const defaultPreferences: WordBuilderPreferences = {
  jlpt_level: 5,
  time_limit: 300, // 5 minutes default
  show_hints: true, // Show hints by default
  auto_validate: true, // Auto-validate by default
  auto_clear_on_success: true, // Auto-clear on success by default
}

const initialState = {
  sessionId: null,
  kanjiPool: [],
  validWords: [],
  timeLimit: 300,
  currentSlots: [null, null, null, null],
  formedWords: [],
  usedKanjiIds: new Set<number>(),
  totalAttempts: 0,
  successfulWords: 0,
  refreshCount: 0,
  timeRemaining: 300,
  isPlaying: false,
  startTime: null,
  preferences: defaultPreferences,
}

export const useWordBuilderStore = create<WordBuilderStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setPreferences: (preferences) => set({ preferences }),
      
      initSession: (sessionId, kanji, validWords, timeLimit) => {
        set({
          sessionId,
          kanjiPool: kanji,
          validWords,
          timeLimit,
          timeRemaining: timeLimit,
          currentSlots: [null, null, null, null],
          formedWords: [],
          usedKanjiIds: new Set(kanji.map(k => k.id)),
          totalAttempts: 0,
          successfulWords: 0,
          refreshCount: 0,
          isPlaying: false,
          startTime: null,
        })
      },
      
      placeKanjiInSlot: (kanji, slotIndex) => {
        if (slotIndex < 0 || slotIndex >= 4) return
        
        set((state) => {
          const newSlots = [...state.currentSlots]
          newSlots[slotIndex] = kanji
          return { currentSlots: newSlots }
        })
      },
      
      removeKanjiFromSlot: (slotIndex) => {
        if (slotIndex < 0 || slotIndex >= 4) return
        
        set((state) => {
          const newSlots = [...state.currentSlots]
          newSlots[slotIndex] = null
          return { currentSlots: newSlots }
        })
      },
      
      swapSlots: (fromIndex, toIndex) => {
        if (fromIndex < 0 || fromIndex >= 4 || toIndex < 0 || toIndex >= 4) return
        if (fromIndex === toIndex) return
        
        set((state) => {
          const newSlots = [...state.currentSlots]
          const temp = newSlots[fromIndex]
          newSlots[fromIndex] = newSlots[toIndex]
          newSlots[toIndex] = temp
          return { currentSlots: newSlots }
        })
      },
      
      clearSlots: () => {
        set({ currentSlots: [null, null, null, null] })
      },
      
      validateCurrentWord: () => {
        const state = get()
        const kanjiChars = state.currentSlots
          .filter(k => k !== null)
          .map(k => k!.character)
          .join('')
        
        if (kanjiChars.length === 0) return null
        
        // Check against pre-computed valid words
        const matchedWord = state.validWords.find(w => w.kanji === kanjiChars)
        
        if (matchedWord) {
          // Success!
          get().addFormedWord(matchedWord)
          // Auto-clear if enabled
          if (state.preferences.auto_clear_on_success) {
            get().clearSlots()
          }
          return matchedWord
        } else {
          // Invalid combination
          get().incrementAttempts()
          return null
        }
      },
      
      addFormedWord: (word) => {
        set((state) => ({
          formedWords: [...state.formedWords, word],
          successfulWords: state.successfulWords + 1,
        }))
      },
      
      incrementAttempts: () => {
        set((state) => ({
          totalAttempts: state.totalAttempts + 1,
        }))
      },
      
      refreshKanji: (kanji, validWords) => {
        set((state) => ({
          kanjiPool: kanji,
          validWords,
          currentSlots: [null, null, null, null],
          usedKanjiIds: new Set([...state.usedKanjiIds, ...kanji.map(k => k.id)]),
          refreshCount: state.refreshCount + 1,
        }))
      },
      
      startTimer: () => {
        const startTime = Date.now()
        set({ isPlaying: true, startTime })
      },
      
      updateTimer: (remaining) => {
        set({ timeRemaining: remaining })
      },
      
      stopTimer: () => {
        set({ isPlaying: false })
      },
      
      resetGame: () => {
        set({
          ...initialState,
          preferences: get().preferences, // Keep preferences
        })
      },
    }),
    {
      name: 'word-builder-preferences',
      version: 1,
      partialize: (state) => ({
        preferences: state.preferences, // Only persist preferences
      }),
    }
  )
)

