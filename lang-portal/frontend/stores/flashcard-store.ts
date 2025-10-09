import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PartOfSpeech } from '@/types/pos-enum'

export interface FlashcardPreferences {
  // Content Selection
  level: number
  selectedCourse: number | null
  selectedUnit: number | null
  count: number
  
  // Part of Speech Filtering
  selectedPartsOfSpeech: PartOfSpeech[]
  
  // Display Options
  showKana: boolean
  showKanji: boolean
  showRomaji: boolean
  showEnglish: boolean
  
  // Ask Options
  askForKana: boolean
  askForKanji: boolean
  askForRomaji: boolean
  askForEnglish: boolean
}

interface FlashcardStore extends FlashcardPreferences {
  // Actions
  setLevel: (level: number) => void
  setCourse: (courseId: number | null) => void
  setUnit: (unitId: number | null) => void
  setCount: (count: number) => void
  setPartsOfSpeech: (parts: PartOfSpeech[]) => void
  
  setShowOptions: (options: Partial<Pick<FlashcardPreferences, 'showKana' | 'showKanji' | 'showRomaji' | 'showEnglish'>>) => void
  setAskOptions: (options: Partial<Pick<FlashcardPreferences, 'askForKana' | 'askForKanji' | 'askForRomaji' | 'askForEnglish'>>) => void
  
  // Smart validation
  validateAndFixOptions: () => void
  
  // Reset
  resetToDefaults: () => void
}

const defaultPreferences: FlashcardPreferences = {
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
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      
      setLevel: (level) => set({ level, selectedCourse: null, selectedUnit: null }),
      setCourse: (selectedCourse) => set({ selectedCourse, selectedUnit: null }),
      setUnit: (selectedUnit) => set({ selectedUnit }),
      setCount: (count) => set({ count }),
      setPartsOfSpeech: (selectedPartsOfSpeech) => set({ selectedPartsOfSpeech }),
      
      setShowOptions: (options) => {
        set((state) => {
          const newState = { ...state, ...options }
          // Auto-validate after setting show options
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
          
          // Rule 4: Special case for hiragana/katakana
          // Note: We can't validate kanji availability here since we don't have word data
          // This validation will need to happen on the backend or with word data
          
          return newState
        })
      },
      
      resetToDefaults: () => set(defaultPreferences),
    }),
    {
      name: 'flashcard-preferences',
      version: 1,
    }
  )
)
