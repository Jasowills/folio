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
    const available = pageHeight - padding

    const sectionEls = measure.querySelectorAll<HTMLElement>('[data-section]')
    const heights: { name: SectionName; height: number }[] = []
    sectionEls.forEach((el) => {
      const name = el.getAttribute('data-section') as SectionName | null
      if (name) {
        heights.push({ name, height: el.offsetHeight })
      }
    })

    if (heights.length === 0) {
      setPages([ALL_SECTIONS])
      return
    }

    const totalHeight = heights.reduce((sum, h) => sum + h.height, 0)
    if (totalHeight <= available) {
      setPages([ALL_SECTIONS])
      return
    }

    const distribution: SectionName[][] = [[]]
    let current = 0
    for (const { name, height } of heights) {
      if (current + height > available && current > 0) {
        distribution.push([])
        current = 0
      }
      distribution[distribution.length - 1].push(name)
      current += height
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
