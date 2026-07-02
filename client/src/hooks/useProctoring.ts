import { useEffect, useRef, useCallback } from 'react'

interface ProctoringEvent {
  type: 'gaze_offscreen' | 'multiple_faces' | 'tab_switch' | 'window_blur' | 'long_silence' | 'second_voice' | 'large_paste' | 'fast_typing_burst'
  severity: 'low' | 'medium' | 'high'
  duration: number | null
  metadata?: Record<string, unknown>
}

interface UseProctoringOptions {
  enabled: boolean
  onEvent: (event: ProctoringEvent) => void
}

export function useProctoring({ enabled, onEvent }: UseProctoringOptions) {
  const blurStartRef = useRef<number | null>(null)

  // Page Visibility API — detect tab switches
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onEvent({
          type: 'tab_switch',
          severity: 'high',
          duration: null,
          metadata: { timestamp: Date.now() },
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, onEvent])

  // Window blur — detect when the window loses focus
  useEffect(() => {
    if (!enabled) return

    const handleBlur = () => {
      blurStartRef.current = Date.now()
      onEvent({
        type: 'window_blur',
        severity: 'medium',
        duration: null,
        metadata: { timestamp: Date.now() },
      })
    }

    const handleFocus = () => {
      if (blurStartRef.current) {
        blurStartRef.current = null
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [enabled, onEvent])

  // Paste detection
  useEffect(() => {
    if (!enabled) return

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || ''
      if (text.length > 50) {
        onEvent({
          type: 'large_paste',
          severity: 'high',
          duration: null,
          metadata: { length: text.length },
        })
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [enabled, onEvent])
}

export function useProctoringHandler(sendEvent: (event: ProctoringEvent) => void) {
  return useCallback(
    (event: ProctoringEvent) => {
      sendEvent(event)
    },
    [sendEvent],
  )
}
