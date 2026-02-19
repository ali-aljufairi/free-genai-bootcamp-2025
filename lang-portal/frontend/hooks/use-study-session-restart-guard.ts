import { useRef, useState } from "react"
import { useStudyAlertStore } from "@/stores/study-alert-store"

interface UseStudySessionRestartGuardOptions<TConfig> {
  getCurrentSignature: () => string
  getConfigSignature: (config: TConfig) => string
  restoreConfig: (config: TConfig) => void
  onContinueCurrentSession: () => void
  onStartNewSession: () => void
}

interface HandleConfigStartArgs {
  hasActiveSession: boolean
  hasProgress: boolean
}

export function useStudySessionRestartGuard<TConfig>({
  getCurrentSignature,
  getConfigSignature,
  restoreConfig,
  onContinueCurrentSession,
  onStartNewSession,
}: UseStudySessionRestartGuardOptions<TConfig>) {
  const activeSignatureRef = useRef<string | null>(null)
  const activeConfigRef = useRef<TConfig | null>(null)
  const [showRestartDialog, setShowRestartDialogState] = useState(false)
  const [dontShowRestartDialogAgain, setDontShowRestartDialogAgain] = useState(false)

  const showRestartWarning = useStudyAlertStore((s) => s.showRestartWarning)
  const setShowRestartWarning = useStudyAlertStore((s) => s.setShowRestartWarning)

  const persistDialogPreference = () => {
    if (dontShowRestartDialogAgain) {
      setShowRestartWarning(false)
    }
  }

  const rememberActiveSession = (config: TConfig) => {
    activeSignatureRef.current = getConfigSignature(config)
    activeConfigRef.current = config
  }

  const clearActiveSession = () => {
    activeSignatureRef.current = null
    activeConfigRef.current = null
  }

  const setShowRestartDialog = (open: boolean) => {
    setShowRestartDialogState(open)
    if (!open) {
      setDontShowRestartDialogAgain(false)
    }
  }

  const handleConfigStart = ({ hasActiveSession, hasProgress }: HandleConfigStartArgs) => {
    if (!hasActiveSession) {
      onStartNewSession()
      return
    }

    const nextSignature = getCurrentSignature()
    const requiresNewSession = activeSignatureRef.current !== nextSignature

    if (!requiresNewSession) {
      onContinueCurrentSession()
      return
    }

    if (!hasProgress || !showRestartWarning) {
      onStartNewSession()
      return
    }

    setShowRestartDialog(true)
  }

  const keepCurrentSession = () => {
    if (activeConfigRef.current) {
      restoreConfig(activeConfigRef.current)
    }

    persistDialogPreference()
    setShowRestartDialog(false)
    setDontShowRestartDialogAgain(false)
    onContinueCurrentSession()
  }

  const startNewSession = () => {
    persistDialogPreference()
    setShowRestartDialog(false)
    setDontShowRestartDialogAgain(false)
    onStartNewSession()
  }

  return {
    showRestartDialog,
    setShowRestartDialog,
    dontShowRestartDialogAgain,
    setDontShowRestartDialogAgain,
    rememberActiveSession,
    clearActiveSession,
    handleConfigStart,
    keepCurrentSession,
    startNewSession,
  }
}
