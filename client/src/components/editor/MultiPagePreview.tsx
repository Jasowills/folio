import { useLayoutEffect, useRef, useState } from 'react'
import { A4Page } from './A4Page'
import type { SectionName } from '../../pages/editor/types'
import { ALL_SECTIONS } from '../../pages/editor/types'

export interface PageInfo {
  showSections: Set<SectionName> | undefined
  pageIndex: number | undefined
}

interface Props {
  children: (info: PageInfo) => React.ReactNode
  zoom: number
  singlePage?: boolean
  contentKey?: string
}

export function MultiPagePreview({ children, zoom, singlePage, contentKey }: Props) {
  const [pages, setPages] = useState<SectionName[][] | null>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (singlePage) return
    const measure = measureRef.current
    const pageEl = pageRef.current
    if (!measure || !pageEl) return

    const pageHeight = pageEl.offsetHeight
    const padding = 80

    const allSectionEls = measure.querySelectorAll<HTMLElement>('[data-section]')
    const mainSectionEls: HTMLElement[] = []
    const sidebarSectionNames: SectionName[] = []

    allSectionEls.forEach((el) => {
      const name = el.getAttribute('data-section') as SectionName | null
      if (!name) return
      if (el.closest('[data-header]')) {
        sidebarSectionNames.push(name)
      } else {
        mainSectionEls.push(el)
      }
    })

    const heights: { name: SectionName; height: number }[] = []
    mainSectionEls.forEach((el, i) => {
      const name = el.getAttribute('data-section') as SectionName | null
      if (!name) return
      const next = mainSectionEls[i + 1]
      // Measure from this section's top to the next section's top so inter-section
      // margins (space-y, mb-*, mt-*) are included. Last section has no gap after it.
      const h = next
        ? next.getBoundingClientRect().top - el.getBoundingClientRect().top
        : el.offsetHeight
      heights.push({ name, height: h })
    })

    if (heights.length === 0) {
      setPages([ALL_SECTIONS])
      return
    }

    // Check if total content (including header) fits on one page
    const scrollHeight = pageEl.scrollHeight
    if (scrollHeight <= pageHeight) {
      setPages([ALL_SECTIONS])
      return
    }

    // Measure non-section overhead (header + top padding) before first section
    const firstSection = mainSectionEls[0]
    const pageRect = pageEl.getBoundingClientRect()
    const firstSectionRect = firstSection.getBoundingClientRect()
    const topOverhead = Math.max(0, firstSectionRect.top - pageRect.top)
    const bottomPad = padding / 2

    // Page 0 has reduced space due to header; subsequent pages have full space
    const availablePage0 = Math.max(0, pageHeight - topOverhead - bottomPad)
    const available = pageHeight - padding

    const distribution: SectionName[][] = [[]]
    let current = 0
    let isFirstPage = true
    for (const { name, height } of heights) {
      const limit = isFirstPage ? availablePage0 : available
      if (current + height > limit && current > 0) {
        distribution.push([])
        current = 0
        isFirstPage = false
      }
      distribution[distribution.length - 1].push(name)
      current += height
    }

    // Ensure sidebar sections always appear on page 0 (the sidebar only renders there)
    if (distribution.length > 0) {
      for (const name of sidebarSectionNames) {
        if (!distribution[0].includes(name)) {
          distribution[0].push(name)
        }
      }
    }

    if (distribution[distribution.length - 1].length === 0) {
      distribution.pop()
    }

    setPages(distribution)
  }, [contentKey, singlePage])

  const renderContent = (pageIndex?: number, showSections?: Set<SectionName>) =>
    children({ showSections, pageIndex })

  if (singlePage) {
    return (
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        <div className="w-[210mm] min-h-[297mm] bg-white shadow-lg rounded-sm p-10">
          {renderContent(undefined, undefined)}
        </div>
      </div>
    )
  }

  const showPages = pages ?? [ALL_SECTIONS]

  return (
    <>
      <div ref={measureRef} aria-hidden className="fixed inset-0 pointer-events-none opacity-0">
        <div ref={pageRef} className="w-[210mm] h-[297mm] p-10">
          {renderContent(undefined, undefined)}
        </div>
      </div>
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        {showPages.map((sections, i) => (
          <A4Page key={i} className={i > 0 ? 'mt-2' : ''}>
            {renderContent(i, new Set(sections))}
          </A4Page>
        ))}
      </div>
    </>
  )
}
