import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GrammarQuestionType } from '@/types/api'

export interface GrammarPreferences {
  // Content Selection
  level: number
  questionType: GrammarQuestionType
  useSRS: boolean // If true, only show questions that need review
  count: number
  
  // SRS Control
  requiredCorrectCount: number
  
  // Timer Settings
  timerDuration: number
}

interface GrammarStore extends GrammarPreferences {
  hasStarted: boolean
  // Actions
  setLevel: (level: number) => void
  setQuestionType: (type: GrammarQuestionType) => void
  setUseSRS: (useSRS: boolean) => void
  setCount: (count: number) => void
  setRequiredCorrectCount: (count: number) => void
  setTimerDuration: (duration: number) => void
  setHasStarted: (hasStarted: boolean) => void
  
  // Reset
  resetToDefaults: () => void
}

const defaultPreferences: GrammarPreferences = {
  level: 5,
  questionType: 'all',
  useSRS: false,
  count: 10,
  requiredCorrectCount: 3,
  timerDuration: 0, // 0 = off, 10/15/20/30 = seconds
}

export const useGrammarStore = create<GrammarStore>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      hasStarted: false,
      
      setLevel: (level) => set({ level }),
      setQuestionType: (questionType) => set({ questionType }),
      setUseSRS: (useSRS) => set({ useSRS }),
      setCount: (count) => set({ count }),
      setRequiredCorrectCount: (requiredCorrectCount) => set({ requiredCorrectCount }),
      setTimerDuration: (timerDuration) => set({ timerDuration }),
      setHasStarted: (hasStarted) => set({ hasStarted }),
      
      resetToDefaults: () => set((state) => ({ ...defaultPreferences, hasStarted: state.hasStarted })),
    }),
    {
      name: 'grammar-preferences',
      version: 1,
    }
  )
)
