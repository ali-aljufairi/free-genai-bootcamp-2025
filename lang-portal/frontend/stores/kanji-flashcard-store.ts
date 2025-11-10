import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface KanjiFlashcardPreferences {
  // Content Selection
  level: number
  selectedGroup: number | null
  count: number
  
  // Display Options (Kanji)
  showCharacter: boolean
  showOnyomi: boolean
  showKunyomi: boolean
  showKanjiEnglish: boolean
  
  // Ask Options (Kanji)
  askForCharacter: boolean
  askForOnyomi: boolean
  askForKunyomi: boolean
  askForKanjiEnglish: boolean
  
  // SRS Control
  requiredCorrectCount: number
  
  // Timer Settings
  timerDuration: number
}

interface KanjiFlashcardStore extends KanjiFlashcardPreferences {
  // Actions
  setLevel: (level: number) => void
  setGroup: (groupId: number | null) => void
  setCount: (count: number) => void
  setRequiredCorrectCount: (count: number) => void
  setTimerDuration: (duration: number) => void
  
  setKanjiShowOptions: (options: Partial<Pick<KanjiFlashcardPreferences, 'showCharacter' | 'showOnyomi' | 'showKunyomi' | 'showKanjiEnglish'>>) => void
  setKanjiAskOptions: (options: Partial<Pick<KanjiFlashcardPreferences, 'askForCharacter' | 'askForOnyomi' | 'askForKunyomi' | 'askForKanjiEnglish'>>) => void
  
  // Smart validation
  validateAndFixKanjiOptions: () => void
  
  // Reset
  resetToDefaults: () => void
}

const defaultPreferences: KanjiFlashcardPreferences = {
  level: 5,
  selectedGroup: null,
  count: 10,
  
  // Kanji defaults
  showCharacter: true,
  showOnyomi: false,
  showKunyomi: false,
  showKanjiEnglish: false,
  
  askForCharacter: false,
  askForOnyomi: false,
  askForKunyomi: false,
  askForKanjiEnglish: true,
  
  requiredCorrectCount: 3,
  
  timerDuration: 0, // 0 = off, 10/15/20/30 = seconds
}

export const useKanjiFlashcardStore = create<KanjiFlashcardStore>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      
      setLevel: (level) => set({ level }),
      setGroup: (selectedGroup) => set({ selectedGroup }),
      setCount: (count) => set({ count }),
      setRequiredCorrectCount: (requiredCorrectCount) => set({ requiredCorrectCount }),
      setTimerDuration: (timerDuration) => set({ timerDuration }),
      
      setKanjiShowOptions: (options) => {
        set((state) => {
          const newState = { ...state, ...options }
          return newState
        })
        get().validateAndFixKanjiOptions()
      },
      
      setKanjiAskOptions: (options) => {
        set((state) => {
          const newState = { ...state, ...options }
          return newState
        })
        get().validateAndFixKanjiOptions()
      },
      
      validateAndFixKanjiOptions: () => {
        set((state) => {
          const newState = { ...state }
          
          // Rule 1: Don't show what you're asking for (it defeats the purpose)
          if (newState.askForCharacter && newState.showCharacter) {
            newState.showCharacter = false
          }
          if (newState.askForOnyomi && newState.showOnyomi) {
            newState.showOnyomi = false
          }
          if (newState.askForKunyomi && newState.showKunyomi) {
            newState.showKunyomi = false
          }
          if (newState.askForKanjiEnglish && newState.showKanjiEnglish) {
            newState.showKanjiEnglish = false
          }
          
          // Rule 2: Must have at least one ask option
          const hasAnyAsk = newState.askForCharacter || newState.askForOnyomi || 
                           newState.askForKunyomi || newState.askForKanjiEnglish
          
          if (!hasAnyAsk) {
            newState.askForKanjiEnglish = true // Default fallback
            newState.showKanjiEnglish = false // Don't show what we're asking for
          }
          
          // Rule 3: Must have at least one show option (except what we're asking for)
          const hasAnyShow = newState.showCharacter || newState.showOnyomi || 
                            newState.showKunyomi || newState.showKanjiEnglish
          
          if (!hasAnyShow) {
            // Show character by default (it's always available)
            if (!newState.askForCharacter) {
              newState.showCharacter = true
            } else if (!newState.askForOnyomi) {
              newState.showOnyomi = true
            } else if (!newState.askForKunyomi) {
              newState.showKunyomi = true
            }
          }
          
          return newState
        })
      },
      
      resetToDefaults: () => set(defaultPreferences),
    }),
    {
      name: 'kanji-flashcard-preferences',
      version: 1,
    }
  )
)

