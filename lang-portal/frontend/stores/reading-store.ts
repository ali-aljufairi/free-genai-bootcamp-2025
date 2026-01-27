import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReadingQuestionType } from '@/types/api'

export interface ReadingPreferences {
  // Content Selection
  level: number
  questionType: ReadingQuestionType
  useSRS: boolean // If true, only show questions that need review
  count: number
  
  // SRS Control
  requiredCorrectCount: number
  
  // Timer Settings
  timerDuration: number
}

interface ReadingStore extends ReadingPreferences {
  // Actions
  setLevel: (level: number) => void
  setQuestionType: (type: ReadingQuestionType) => void
  setUseSRS: (useSRS: boolean) => void
  setCount: (count: number) => void
  setRequiredCorrectCount: (count: number) => void
  setTimerDuration: (duration: number) => void
  
  // Reset
  resetToDefaults: () => void
}

const defaultPreferences: ReadingPreferences = {
  level: 5,
  questionType: 'all',
  useSRS: false,
  count: 10,
  requiredCorrectCount: 3,
  timerDuration: 0, // 0 = off, 10/15/20/30 = seconds
}

export const useReadingStore = create<ReadingStore>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      
      setLevel: (level) => set({ level }),
      setQuestionType: (questionType) => set({ questionType }),
      setUseSRS: (useSRS) => set({ useSRS }),
      setCount: (count) => set({ count }),
      setRequiredCorrectCount: (requiredCorrectCount) => set({ requiredCorrectCount }),
      setTimerDuration: (timerDuration) => set({ timerDuration }),
      
      resetToDefaults: () => set(defaultPreferences),
    }),
    {
      name: 'reading-preferences',
      version: 1,
    }
  )
)
