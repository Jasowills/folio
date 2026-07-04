import { useEffect } from 'react'

interface Handlers {
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleCommandPalette: () => void
  onToggleEditMode: () => void
  onToggleStyles: () => void
  onToggleSections: () => void
  onToggleAi: () => void
  onClosePanels: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

export default function useEditorKeyboard(handlers: Handlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCmd = e.metaKey || e.ctrlKey
      const cmdK = isCmd && e.key === 'k'
      const cmdS = isCmd && e.key === 's'
      const cmdZ = isCmd && e.key === 'z' && !e.shiftKey
      const cmdShiftZ = isCmd && e.key === 'z' && e.shiftKey
      const cmdE = isCmd && e.key === 'e'
      const cmdD = isCmd && e.key === 'd'
      const cmdP = isCmd && e.key === 'p'
      const esc = e.key === 'Escape'
      const cmdPlus = isCmd && (e.key === '=' || e.key === '+')
      const cmdMinus = isCmd && e.key === '-'
      const cmd0 = isCmd && e.key === '0'

      if (cmdS) { e.preventDefault(); handlers.onSave() }
      else if (cmdZ) { e.preventDefault(); handlers.onUndo() }
      else if (cmdShiftZ) { e.preventDefault(); handlers.onRedo() }
      else if (cmdK) { e.preventDefault(); handlers.onToggleCommandPalette() }
      else if (cmdE) { e.preventDefault(); handlers.onToggleEditMode() }
      else if (cmdD) { e.preventDefault(); handlers.onToggleStyles() }
      else if (cmdP) { e.preventDefault(); handlers.onToggleSections() }
      else if (esc) { handlers.onClosePanels() }
      else if (cmdPlus) { e.preventDefault(); handlers.onZoomIn() }
      else if (cmdMinus) { e.preventDefault(); handlers.onZoomOut() }
      else if (cmd0) { e.preventDefault(); handlers.onZoomReset() }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
