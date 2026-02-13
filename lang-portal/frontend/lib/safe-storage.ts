type BrowserStorageType = 'localStorage' | 'sessionStorage'

function logStorageWarning(message: string, error: unknown): void {
  if (process.env.NODE_ENV !== 'development') return
  console.warn(message, error)
}

function getBrowserStorage(storageType: BrowserStorageType): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window[storageType]
  } catch (error) {
    // Access can throw SecurityError in restricted browser contexts.
    logStorageWarning(`[Storage] ${storageType} is unavailable`, error)
    return null
  }
}

function safeStorageGetItem(storageType: BrowserStorageType, key: string): string | null {
  const storage = getBrowserStorage(storageType)
  if (!storage) return null

  try {
    return storage.getItem(key)
  } catch (error) {
    logStorageWarning(`[Storage] Failed to read key "${key}" from ${storageType}`, error)
    return null
  }
}

function safeStorageSetItem(storageType: BrowserStorageType, key: string, value: string): boolean {
  const storage = getBrowserStorage(storageType)
  if (!storage) return false

  try {
    storage.setItem(key, value)
    return true
  } catch (error) {
    logStorageWarning(`[Storage] Failed to write key "${key}" to ${storageType}`, error)
    return false
  }
}

function safeStorageRemoveItem(storageType: BrowserStorageType, key: string): boolean {
  const storage = getBrowserStorage(storageType)
  if (!storage) return false

  try {
    storage.removeItem(key)
    return true
  } catch (error) {
    logStorageWarning(`[Storage] Failed to remove key "${key}" from ${storageType}`, error)
    return false
  }
}

function safeStorageKeys(storageType: BrowserStorageType): string[] {
  const storage = getBrowserStorage(storageType)
  if (!storage) return []

  try {
    const keys: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key) keys.push(key)
    }
    return keys
  } catch (error) {
    logStorageWarning(`[Storage] Failed to list keys from ${storageType}`, error)
    return []
  }
}

export function safeLocalStorageGetItem(key: string): string | null {
  return safeStorageGetItem('localStorage', key)
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  return safeStorageSetItem('localStorage', key, value)
}

export function safeLocalStorageRemoveItem(key: string): boolean {
  return safeStorageRemoveItem('localStorage', key)
}

export function safeSessionStorageGetItem(key: string): string | null {
  return safeStorageGetItem('sessionStorage', key)
}

export function safeSessionStorageSetItem(key: string, value: string): boolean {
  return safeStorageSetItem('sessionStorage', key, value)
}

export function safeSessionStorageRemoveItem(key: string): boolean {
  return safeStorageRemoveItem('sessionStorage', key)
}

export function safeSessionStorageKeys(): string[] {
  return safeStorageKeys('sessionStorage')
}
