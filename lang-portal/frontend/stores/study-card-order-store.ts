import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { studyOptions } from '@/components/study-session/constants'
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from '@/lib/safe-storage'

/**
 * Store for managing the order of study cards in the hub
 * Persists user's preferred card arrangement across sessions
 */
export interface StudyCardOrderStore {
  // State
  cardOrder: string[]
  
  // Actions
  setCardOrder: (order: string[]) => void
  resetOrder: () => void
  moveCard: (fromIndex: number, toIndex: number) => void
}

/**
 * Default card order based on the studyOptions array
 * This ensures new users get a sensible default arrangement
 */
const getDefaultOrder = (): string[] => {
  return studyOptions.map(option => option.type)
}

const safePersistStorage: StateStorage = {
  getItem: (name: string) => safeLocalStorageGetItem(name),
  setItem: (name: string, value: string) => {
    safeLocalStorageSetItem(name, value)
  },
  removeItem: (name: string) => {
    safeLocalStorageRemoveItem(name)
  },
}

/**
 * Zustand store with persistence for study card order
 * Uses localStorage to maintain user's preferred arrangement
 */
export const useStudyCardOrderStore = create<StudyCardOrderStore>()(
  persist(
    (set, get) => ({
      // Initial state
      cardOrder: getDefaultOrder(),
      
      /**
       * Set the complete card order
       * @param order - Array of card type strings in desired order
       */
      setCardOrder: (order: string[]) => {
        set({ cardOrder: order })
      },
      
      /**
       * Reset card order to default arrangement
       */
      resetOrder: () => {
        set({ cardOrder: getDefaultOrder() })
      },
      
      /**
       * Move a card from one position to another
       * @param fromIndex - Current index of the card
       * @param toIndex - Target index for the card
       */
      moveCard: (fromIndex: number, toIndex: number) => {
        const { cardOrder } = get()
        const newOrder = [...cardOrder]
        const [movedCard] = newOrder.splice(fromIndex, 1)
        newOrder.splice(toIndex, 0, movedCard)
        set({ cardOrder: newOrder })
      },
    }),
    {
      name: 'study-card-order', // localStorage key
      version: 1, // Version for future migrations
      storage: createJSONStorage(() => safePersistStorage),
      // Add partialize to ensure only cardOrder is persisted
      partialize: (state) => ({ cardOrder: state.cardOrder }),
    }
  )
)

/**
 * Hook to get sorted study options based on user's preferred order
 * @returns Array of study options sorted according to user preference
 */
export const useSortedStudyOptions = () => {
  const { cardOrder } = useStudyCardOrderStore()
  
  return studyOptions.sort((a, b) => {
    const aIndex = cardOrder.indexOf(a.type)
    const bIndex = cardOrder.indexOf(b.type)
    
    // If a card type is not in the order array, put it at the end
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    
    return aIndex - bIndex
  })
}
