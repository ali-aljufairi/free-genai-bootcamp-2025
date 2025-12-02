import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PartOfSpeech } from '@/types/pos-enum'

export interface WordFlashcardPreferences {
  // Content Selection
  level: number
  selectedCourse: number | null
  selectedUnit: number | null
  count: number
  
  // Part of Speech Filtering
  selectedPartsOfSpeech: PartOfSpeech[]
  
  // Display Options (Words)
  showKana: boolean
  showKanji: boolean
  showRomaji: boolean
  showEnglish: boolean
  
  // Ask Options (Words)
  askForKana: boolean
  askForKanji: boolean
  askForRomaji: boolean
  askForEnglish: boolean
  
  // SRS Control
  useSRS: boolean // If true, use SRS due items as content source
  requiredCorrectCount: number
  
  // Timer Settings
  timerDuration: number
}

interface WordFlashcardStore extends WordFlashcardPreferences {
  // Actions
  setLevel: (level: number) => void
  setCourse: (courseId: number | null) => void
  setUnit: (unitId: number | null) => void
  setCount: (count: number) => void
  setPartsOfSpeech: (parts: PartOfSpeech[]) => void
  setUseSRS: (useSRS: boolean) => void
  setRequiredCorrectCount: (count: number) => void
  setTimerDuration: (duration: number) => void
  
  setShowOptions: (options: Partial<Pick<WordFlashcardPreferences, 'showKana' | 'showKanji' | 'showRomaji' | 'showEnglish'>>) => void
  setAskOptions: (options: Partial<Pick<WordFlashcardPreferences, 'askForKana' | 'askForKanji' | 'askForRomaji' | 'askForEnglish'>>) => void
  
  // Smart validation
  validateAndFixOptions: () => void
  
  // Reset
  resetToDefaults: () => void
}

const defaultPreferences: WordFlashcardPreferences = {
  level: 5,
  selectedCourse: null,
  selectedUnit: null,
  count: 10,
  
  selectedPartsOfSpeech: [],
  
  showKana: true,
  showKanji: false,
  showRomaji: false,
  showEnglish: false,
  
  askForKana: false,
  askForKanji: false,
  askForRomaji: false,
  askForEnglish: true,
  
  useSRS: false,
  requiredCorrectCount: 3,
  
  timerDuration: 0, // 0 = off, 10/15/20/30 = seconds
}

export const useWordFlashcardStore = create<WordFlashcardStore>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      
      setLevel: (level) => set({ level, selectedCourse: null, selectedUnit: null }),
      setCourse: (selectedCourse) => set({ selectedCourse, selectedUnit: null }),
      setUnit: (selectedUnit) => set({ selectedUnit }),
      setCount: (count) => set({ count }),
      setPartsOfSpeech: (selectedPartsOfSpeech) => set({ selectedPartsOfSpeech }),
      setUseSRS: (useSRS) => set({ useSRS }),
      setRequiredCorrectCount: (requiredCorrectCount) => set({ requiredCorrectCount }),
      setTimerDuration: (timerDuration) => set({ timerDuration }),
      
      setShowOptions: (options) => {
        set((state) => {
          const newState = { ...state, ...options }
          return newState
        })
        get().validateAndFixOptions()
      },
      
      setAskOptions: (options) => {
        set((state) => {
          const newState = { ...state, ...options }
          return newState
        })
        get().validateAndFixOptions()
      },
      
      validateAndFixOptions: () => {
        set((state) => {
          const newState = { ...state }
          
          // Rule 1: Don't show what you're asking for (it defeats the purpose)
          if (newState.askForKana && newState.showKana) {
            newState.showKana = false
          }
          if (newState.askForKanji && newState.showKanji) {
            newState.showKanji = false
          }
          if (newState.askForRomaji && newState.showRomaji) {
            newState.showRomaji = false
          }
          if (newState.askForEnglish && newState.showEnglish) {
            newState.showEnglish = false
          }
          
          // Rule 2: Must have at least one ask option
          const hasAnyAsk = newState.askForKana || newState.askForKanji || 
                           newState.askForRomaji || newState.askForEnglish
          
          if (!hasAnyAsk) {
            newState.askForEnglish = true // Default fallback
            newState.showEnglish = false // Don't show what we're asking for
          }
          
          // Rule 3: Must have at least one show option (except what we're asking for)
          const hasAnyShow = newState.showKana || newState.showKanji || 
                            newState.showRomaji || newState.showEnglish
          
          if (!hasAnyShow) {
            // Show kana by default (it's always available)
            if (!newState.askForKana) {
              newState.showKana = true
            } else if (!newState.askForRomaji) {
              newState.showRomaji = true
            }
          }
          
          return newState
        })
      },
      
      resetToDefaults: () => set(defaultPreferences),
    }),
    {
      name: 'word-flashcard-preferences',
      version: 1,
    }
  )
)

