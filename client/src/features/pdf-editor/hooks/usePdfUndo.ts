import { useRef, useCallback } from 'react'
import type { PdfLayoutPage } from '../../../lib/queries'

const MAX_UNDO = 50

interface Snapshot {
  pages: PdfLayoutPage[]
}

export function usePdfUndo() {
  const undoStack = useRef<Snapshot[]>([])
  const redoStack = useRef<Snapshot[]>([])

  const pushSnapshot = useCallback((pages: PdfLayoutPage[]) => {
    const snap: Snapshot = { pages: JSON.parse(JSON.stringify(pages)) }
    undoStack.current.push(snap)
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
    redoStack.current = []
  }, [])

  const undo = useCallback((currentPages: PdfLayoutPage[]): PdfLayoutPage[] | null => {
    if (undoStack.current.length === 0) return null
    const current: Snapshot = { pages: JSON.parse(JSON.stringify(currentPages)) }
    redoStack.current.push(current)
    const prev = undoStack.current.pop()!
    return prev.pages
  }, [])

  const redo = useCallback((currentPages: PdfLayoutPage[]): PdfLayoutPage[] | null => {
    if (redoStack.current.length === 0) return null
    const current: Snapshot = { pages: JSON.parse(JSON.stringify(currentPages)) }
    undoStack.current.push(current)
    const next = redoStack.current.pop()!
    return next.pages
  }, [])

  const clear = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
  }, [])

  return { pushSnapshot, undo, redo, clear }
}
