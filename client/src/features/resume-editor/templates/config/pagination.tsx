import { useRef, useState, useEffect, useCallback } from 'react'

const A4_HEIGHT_PX = 1123 // 297mm at 96dpi
const MARGIN_PX = 24 // 3mm margins ≈ 24px
const USABLE_HEIGHT = A4_HEIGHT_PX - MARGIN_PX * 2

interface Page {
  sections: string[]
  index: number
}

export function usePagination(sectionOrder: string[]): { pages: Page[][]; containerRef: React.RefObject<HTMLDivElement> } {
  const [pages, setPages] = useState<Page[][]>([[{ sections: sectionOrder, index: 0 }]])
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  const measure = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const sections = Array.from(container.querySelectorAll('[data-section-key]')) as HTMLElement[]

    if (sections.length === 0) {
      setPages([[{ sections: sectionOrder, index: 0 }]])
      return
    }

    const pageBreaks: string[][] = [[]]
    let currentPageHeight = 0
    let currentPageIndex = 0

    sections.forEach(section => {
      const key = section.getAttribute('data-section-key') || ''
      const height = section.offsetHeight

      if (currentPageHeight + height > USABLE_HEIGHT && currentPageHeight > 0) {
        pageBreaks.push([key])
        currentPageIndex++
        currentPageHeight = height
      } else {
        pageBreaks[currentPageIndex].push(key)
        currentPageHeight += height
      }
    })

    setPages(pageBreaks.map((sections, index) => sections.map(s => ({ sections: [s], index }))))
  }, [sectionOrder])

  useEffect(() => {
    const timer = setTimeout(measure, 100)
    return () => clearTimeout(timer)
  }, [measure])

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver(() => {
      measure()
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [measure])

  return { pages, containerRef }
}
