import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UserSettingsState {
  currentJlptLevel: number
  setFromProfile: (level: number | null | undefined) => void
  setFromSettings: (level: number) => void
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set) => ({
      currentJlptLevel: 5,
      setFromProfile: (level) => {
        if (level == null) return
        set({ currentJlptLevel: level })
      },
      setFromSettings: (level) => {
        set({ currentJlptLevel: level })
      },
    }),
    {
      name: "user-settings-store",
      version: 1,
    }
  )
)

