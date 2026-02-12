function logStorageWarning(message: string, error: unknown): void {
  if (process.env.NODE_ENV !== 'development') return
  console.warn(message, error)
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch (error) {
    // Access can throw SecurityError in restricted browser contexts.
    logStorageWarning('[Storage] localStorage is unavailable', error)
    return null
  }
}

export function safeLocalStorageGetItem(key: string): string | null {
  const storage = getLocalStorage()
  if (!storage) return null

  try {
    return storage.getItem(key)
  } catch (error) {
    logStorageWarning(`[Storage] Failed to read key "${key}" from localStorage`, error)
    return null
  }
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    storage.setItem(key, value)
    return true
  } catch (error) {
    logStorageWarning(`[Storage] Failed to write key "${key}" to localStorage`, error)
    return false
  }
}

export function safeLocalStorageRemoveItem(key: string): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    storage.removeItem(key)
    return true
  } catch (error) {
    logStorageWarning(`[Storage] Failed to remove key "${key}" from localStorage`, error)
    return false
  }
}
