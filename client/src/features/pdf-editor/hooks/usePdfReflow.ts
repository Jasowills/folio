import { useCallback, useRef } from 'react'
import type { PdfLayoutBlock } from '../../../lib/queries'

export function usePdfReflow() {
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const registerRef = useCallback((blockId: string, el: HTMLDivElement | null) => {
    if (el) blockRefs.current.set(blockId, el)
    else blockRefs.current.delete(blockId)
  }, [])

  const reflow = useCallback((blocks: PdfLayoutBlock[]): PdfLayoutBlock[] => {
    const sorted = [...blocks].sort((a, b) => a.y - b.y)
    const updated = [...sorted]

    for (let i = 0; i < updated.length; i++) {
      const block = updated[i]
      const el = blockRefs.current.get(block.id)
      if (!el) continue

      const actualHeight = el.scrollHeight
      const heightDiff = actualHeight - block.height

      if (Math.abs(heightDiff) > 1) {
        updated[i] = { ...updated[i], height: actualHeight }
        for (let j = i + 1; j < updated.length; j++) {
          updated[j] = { ...updated[j], y: updated[j].y + heightDiff }
        }
      }
    }

    return updated
  }, [])

  return { registerRef, reflow }
}
