/**
 * View Transitions API utility functions
 * Provides smooth page transitions with fallback for unsupported browsers
 */

/**
 * Type definition for the View Transitions API
 * Extends the Document interface to include startViewTransition
 */
declare global {
  interface Document {
    startViewTransition?: (callback: () => void | Promise<void>) => {
      finished: Promise<void>
      ready: Promise<void>
      updateCallbackDone: Promise<void>
    }
  }
}

/**
 * Check if the browser supports the View Transitions API
 * @returns true if startViewTransition is available
 */
export const supportsViewTransitions = (): boolean => {
  return typeof document !== 'undefined' && 'startViewTransition' in document
}

/**
 * Execute a callback with view transition if supported, otherwise execute immediately
 * @param callback - Function to execute during the transition
 * @returns Promise that resolves when the transition is complete
 */
export const startViewTransition = async (callback: () => void | Promise<void>): Promise<void> => {
  if (supportsViewTransitions()) {
    const transition = document.startViewTransition!(callback)
    return transition.finished
  } else {
    // Fallback for unsupported browsers
    await callback()
  }
}

/**
 * Enhanced version that provides more control over the transition
 * @param callback - Function to execute during the transition
 * @param options - Optional configuration for the transition
 * @returns Promise that resolves when the transition is complete
 */
export const startViewTransitionWithOptions = async (
  callback: () => void | Promise<void>,
  options?: {
    skipTransition?: boolean
    transitionName?: string
  }
): Promise<void> => {
  // Skip transition if explicitly requested or reduced motion is preferred
  if (options?.skipTransition || prefersReducedMotion()) {
    await callback()
    return
  }

  if (supportsViewTransitions()) {
    // Set transition name if provided
    if (options?.transitionName) {
      document.documentElement.style.setProperty('--view-transition-name', options.transitionName)
    }

    const transition = document.startViewTransition!(callback)
    return transition.finished
  } else {
    await callback()
  }
}

/**
 * Check if the user prefers reduced motion
 * @returns true if reduced motion is preferred
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Create a view transition name for CSS targeting
 * @param name - Base name for the transition
 * @returns CSS custom property value
 */
export const createTransitionName = (name: string): string => {
  return `--view-transition-${name}`
}

/**
 * Set CSS custom properties for view transitions
 * @param properties - Object of CSS custom properties to set
 */
export const setTransitionProperties = (properties: Record<string, string>): void => {
  if (typeof document === 'undefined') return

  Object.entries(properties).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value)
  })
}

/**
 * Clear view transition CSS custom properties
 * @param properties - Array of property names to clear
 */
export const clearTransitionProperties = (properties: string[]): void => {
  if (typeof document === 'undefined') return

  properties.forEach(property => {
    document.documentElement.style.removeProperty(property)
  })
}

/**
 * Hook for React components to use view transitions
 * @param callback - Function to execute during transition
 * @returns Function that can be called to trigger the transition
 */
export const useViewTransition = (callback: () => void | Promise<void>) => {
  return () => startViewTransition(callback)
}

/**
 * Utility for Next.js router navigation with view transitions
 * @param router - Next.js router instance
 * @param url - URL to navigate to
 * @param options - Optional transition options
 */
export const navigateWithTransition = async (
  router: { push: (url: string) => void },
  url: string,
  options?: {
    skipTransition?: boolean
    transitionName?: string
  }
): Promise<void> => {
  await startViewTransitionWithOptions(() => {
    router.push(url)
  }, options)
}

/**
 * Predefined transition configurations for common use cases
 */
export const transitionConfigs = {
  /**
   * Page navigation transition
   */
  pageNavigation: {
    transitionName: 'page',
    duration: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  /**
   * Modal/dialog transition
   */
  modal: {
    transitionName: 'modal',
    duration: '200ms',
    easing: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
  },
  
  /**
   * Card/item transition
   */
  card: {
    transitionName: 'card',
    duration: '250ms',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
} as const

/**
 * Apply a predefined transition configuration
 * @param config - Configuration name from transitionConfigs
 */
export const applyTransitionConfig = (config: keyof typeof transitionConfigs): void => {
  const { transitionName, duration, easing } = transitionConfigs[config]
  
  setTransitionProperties({
    '--view-transition-name': transitionName,
    '--view-transition-duration': duration,
    '--view-transition-timing-function': easing,
  })
}
