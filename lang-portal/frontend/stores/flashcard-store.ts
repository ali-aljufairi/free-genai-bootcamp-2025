import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PartOfSpeech } from '@/types/pos-enum'

export interface FlashcardPreferences {
  // Content Selection
  level: number
  selectedCourse: number | null
  selectedUnit: number | null
  selectedGroup: number | null // Kanji uses groups, not units/courses
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
  useSRS: boolean // If true, use SRS due items as content source
  requiredCorrectCount: number
  
  // Timer Settings
  timerDuration: number
}

interface FlashcardStore extends FlashcardPreferences {
  // Actions
  setLevel: (level: number) => void
  setCourse: (courseId: number | null) => void
  setUnit: (unitId: number | null) => void
  setGroup: (groupId: number | null) => void
  setCount: (count: number) => void
  setPartsOfSpeech: (parts: PartOfSpeech[]) => void
  setUseSRS: (useSRS: boolean) => void
  setRequiredCorrectCount: (count: number) => void
  setTimerDuration: (duration: number) => void
  
  setShowOptions: (options: Partial<Pick<FlashcardPreferences, 'showKana' | 'showKanji' | 'showRomaji' | 'showEnglish'>>) => void
  setAskOptions: (options: Partial<Pick<FlashcardPreferences, 'askForKana' | 'askForKanji' | 'askForRomaji' | 'askForEnglish'>>) => void
  
  setKanjiShowOptions: (options: Partial<Pick<FlashcardPreferences, 'showCharacter' | 'showOnyomi' | 'showKunyomi' | 'showKanjiEnglish'>>) => void
  setKanjiAskOptions: (options: Partial<Pick<FlashcardPreferences, 'askForCharacter' | 'askForOnyomi' | 'askForKunyomi' | 'askForKanjiEnglish'>>) => void
  
  // Smart validation
  validateAndFixOptions: () => void
  validateAndFixKanjiOptions: () => void
  
  // Reset
  resetToDefaults: () => void
}

const defaultPreferences: FlashcardPreferences = {
  level: 5,
  selectedCourse: null,
  selectedUnit: null,
  selectedGroup: null,
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
  
  // Kanji defaults
  showCharacter: true,
  showOnyomi: false,
  showKunyomi: false,
  showKanjiEnglish: false,
  
  askForCharacter: false,
  askForOnyomi: false,
  askForKunyomi: false,
  askForKanjiEnglish: true,
  
  useSRS: false,
  requiredCorrectCount: 3,
  
  timerDuration: 0, // 0 = off, 10/15/20/30 = seconds
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      
      setLevel: (level) => set({ level, selectedCourse: null, selectedUnit: null }),
      setCourse: (selectedCourse) => set({ selectedCourse, selectedUnit: null }),
      setUnit: (selectedUnit) => set({ selectedUnit }),
      setGroup: (selectedGroup) => set({ selectedGroup }),
      setCount: (count) => set({ count }),
      setPartsOfSpeech: (selectedPartsOfSpeech) => set({ selectedPartsOfSpeech }),
      setUseSRS: (useSRS) => set({ useSRS }),
      setRequiredCorrectCount: (requiredCorrectCount) => set({ requiredCorrectCount }),
      setTimerDuration: (timerDuration) => set({ timerDuration }),
      
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
      name: 'flashcard-preferences',
      version: 2, // Increment version for kanji preferences
    }
  )
)
