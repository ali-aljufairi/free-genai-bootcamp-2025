import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CompanionStudyPreferences {
  // Assistant Selection
  selectedAssistant: string
  
  // Transcription Settings
  showTranscription: boolean
  transcriptionLanguage: string
}

interface CompanionStudyStore extends CompanionStudyPreferences {
  // Actions
  setSelectedAssistant: (assistantId: string) => void
  setShowTranscription: (show: boolean) => void
  setTranscriptionLanguage: (language: string) => void
  
  // Reset
  resetToDefaults: () => void
}

const defaultPreferences: CompanionStudyPreferences = {
  selectedAssistant: "815decc2-cab8-4907-9472-cbd6f882f232", // Casual Talk default
  showTranscription: true,
  transcriptionLanguage: 'ja', // Japanese
}

export const useCompanionStudyStore = create<CompanionStudyStore>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      
      setSelectedAssistant: (selectedAssistant) => set({ selectedAssistant }),
      setShowTranscription: (showTranscription) => set({ showTranscription }),
      setTranscriptionLanguage: (transcriptionLanguage) => set({ transcriptionLanguage }),
      
      resetToDefaults: () => set(defaultPreferences),
    }),
    {
      name: 'companion-study-storage',
      version: 1,
    }
  )
)

