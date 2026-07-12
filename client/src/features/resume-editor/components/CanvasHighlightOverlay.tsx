import { useEffect, useRef } from 'react'
import type { CanvasHighlight } from './ai/actions'

interface Props {
  highlights: CanvasHighlight[]
  containerRef: React.RefObject<HTMLDivElement | null>
}

export default function CanvasHighlightOverlay({ highlights, containerRef }: Props) {
  const timeoutRefs = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (highlights.length === 0 || !containerRef.current) return

    const container = containerRef.current
    timeoutRefs.current.forEach(clearTimeout)
    timeoutRefs.current = []

    for (const highlight of highlights) {
      const duration = highlight.duration || 1500

      if (highlight.sectionKey) {
        const sectionEls = container.querySelectorAll(`[data-section="${highlight.sectionKey}"]`)
        sectionEls.forEach(el => {
          const cssClass = highlight.type === 'pulse' ? 'animate-canvas-pulse'
            : highlight.type === 'glow' ? 'animate-canvas-glow'
            : 'animate-canvas-flash'
          el.classList.add(cssClass)
          const t = window.setTimeout(() => el.classList.remove(cssClass), duration)
          timeoutRefs.current.push(t)
        })
      } else {
        const paperEl = container.querySelector('[data-resume-paper]')
        if (paperEl) {
          const cssClass = highlight.type === 'pulse' ? 'animate-canvas-pulse'
            : highlight.type === 'glow' ? 'animate-canvas-glow'
            : 'animate-canvas-flash'
          paperEl.classList.add(cssClass)
          const t = window.setTimeout(() => paperEl.classList.remove(cssClass), duration)
          timeoutRefs.current.push(t)
        }
      }
    }
  }, [highlights, containerRef])

  return null
}
