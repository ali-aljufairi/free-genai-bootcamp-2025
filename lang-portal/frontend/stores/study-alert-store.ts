import { create } from "zustand"
import { persist } from "zustand/middleware"

interface StudyAlertStore {
  showRestartWarning: boolean
  setShowRestartWarning: (show: boolean) => void
}

export const useStudyAlertStore = create<StudyAlertStore>()(
  persist(
    (set) => ({
      showRestartWarning: true,
      setShowRestartWarning: (showRestartWarning) => set({ showRestartWarning }),
    }),
    {
      name: "study-alert-preferences",
      version: 1,
    }
  )
)
