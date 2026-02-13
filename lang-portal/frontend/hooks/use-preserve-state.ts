import { useEffect, useRef } from 'react'
import {
  safeSessionStorageGetItem,
  safeSessionStorageKeys,
  safeSessionStorageRemoveItem,
  safeSessionStorageSetItem,
} from '@/lib/safe-storage'

/**
 * Custom hook to preserve scroll position and component state
 * Alternative to React Activity component until it's available in stable React
 */
export const usePreserveScrollPosition = (key: string) => {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Restore scroll position on mount
    const savedPosition = safeSessionStorageGetItem(`scroll-${key}`)
    if (savedPosition && containerRef.current) {
      const position = JSON.parse(savedPosition)
      containerRef.current.scrollTo(position.x, position.y)
    }

    // Save scroll position on unmount
    return () => {
      if (containerRef.current) {
        const position = {
          x: containerRef.current.scrollLeft,
          y: containerRef.current.scrollTop,
        }
        safeSessionStorageSetItem(`scroll-${key}`, JSON.stringify(position))
      }
    }
  }, [key])

  return containerRef
}

/**
 * Hook to preserve component state across navigation
 * Stores component state in sessionStorage and restores it on return
 */
export const usePreserveState = <T>(key: string, initialState: T) => {
  const stateRef = useRef<T>(initialState)

  useEffect(() => {
    // Restore state on mount
    const savedState = safeSessionStorageGetItem(`state-${key}`)
    if (savedState) {
      try {
        stateRef.current = JSON.parse(savedState)
      } catch (error) {
        console.warn(`Failed to restore state for ${key}:`, error)
      }
    }

    // Save state on unmount
    return () => {
      safeSessionStorageSetItem(`state-${key}`, JSON.stringify(stateRef.current))
    }
  }, [key])

  const setState = (newState: T) => {
    stateRef.current = newState
    safeSessionStorageSetItem(`state-${key}`, JSON.stringify(newState))
  }

  return [stateRef.current, setState] as const
}

/**
 * Hook to preserve form data across navigation
 * Automatically saves form values and restores them on return
 */
export const usePreserveFormData = (key: string) => {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    // Restore form data on mount
    const savedData = safeSessionStorageGetItem(`form-${key}`)
    if (savedData && formRef.current) {
      try {
        const formData = JSON.parse(savedData)
        Object.entries(formData).forEach(([name, value]) => {
          const input = formRef.current?.querySelector(`[name="${name}"]`) as HTMLInputElement
          if (input) {
            if (input.type === 'checkbox') {
              input.checked = value as boolean
            } else {
              input.value = value as string
            }
          }
        })
      } catch (error) {
        console.warn(`Failed to restore form data for ${key}:`, error)
      }
    }

    // Save form data on unmount
    return () => {
      if (formRef.current) {
        const formData = new FormData(formRef.current)
        const data: Record<string, any> = {}
        
        for (const [name, value] of formData.entries()) {
          data[name] = value
        }
        
        safeSessionStorageSetItem(`form-${key}`, JSON.stringify(data))
      }
    }
  }, [key])

  return formRef
}

/**
 * Hook to preserve component visibility state
 * Useful for maintaining which components were visible/hidden
 */
export const usePreserveVisibility = (key: string, defaultVisible: boolean = true) => {
  const [isVisible, setIsVisible] = usePreserveState(key, defaultVisible)

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  const show = () => setIsVisible(true)
  const hide = () => setIsVisible(false)

  return {
    isVisible,
    setIsVisible,
    toggleVisibility,
    show,
    hide,
  }
}

/**
 * Utility to clear all preserved state for a given key
 * Useful for resetting state when needed
 */
export const clearPreservedState = (key: string) => {
  safeSessionStorageRemoveItem(`scroll-${key}`)
  safeSessionStorageRemoveItem(`state-${key}`)
  safeSessionStorageRemoveItem(`form-${key}`)
}

/**
 * Utility to clear all preserved state
 * Use with caution as it clears all preserved state
 */
export const clearAllPreservedState = () => {
  const keys = safeSessionStorageKeys()
  keys.forEach(key => {
    if (key.startsWith('scroll-') || key.startsWith('state-') || key.startsWith('form-')) {
      safeSessionStorageRemoveItem(key)
    }
  })
}
