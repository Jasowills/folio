import { useState, useCallback } from 'react'
import type { TextRegion, PdfTextItem, PdfDocumentData, DocumentFontDefaults } from '../types/pdf'

interface PdfJsTextItem {
  str: string
  width: number
  height: number
  transform: number[]
  fontName: string
}

const BULLET_CHARS = new Set(['•', '∙', '●', '○', '◦', '▪', '▸', '➢', '·', '-', '–', '*', '→', '›', '■', '□', '▹'])

const FONT_NAME_MAP: Record<string, string> = {
  'Helvetica': 'Helvetica',
  'Helvetica-Bold': 'Helvetica',
  'Helvetica-Oblique': 'Helvetica',
  'Helvetica-BoldOblique': 'Helvetica',
  'Times-Roman': 'Times New Roman',
  'Times-Bold': 'Times New Roman',
  'Times-Italic': 'Times New Roman',
  'Times-BoldItalic': 'Times New Roman',
  'Courier': 'Courier New',
  'Courier-Bold': 'Courier New',
  'Courier-Oblique': 'Courier New',
  'Courier-BoldOblique': 'Courier New',
  'Arial': 'Arial',
  'Arial-Bold': 'Arial',
  'Arial-Italic': 'Arial',
  'Arial-BoldItalic': 'Arial',
}

function readableFontName(raw: string): string {
  for (const [key, val] of Object.entries(FONT_NAME_MAP)) {
    if (raw.includes(key)) return val
  }
  if (raw.includes('Bold') || raw.includes('bold')) return 'Helvetica'
  if (raw.includes('Italic') || raw.includes('Oblique')) return 'Helvetica'
  return 'Helvetica'
}

function estimateFontSize(transform: number[]): number {
  const a = Math.abs(transform[0])
  const d = Math.abs(transform[3])
  const size = Math.max(a, d)
  return Math.round(size * 10) / 10 || 11
}

function isBulletLine(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  return BULLET_CHARS.has(trimmed[0]) || /^\d+[\.\)]/.test(trimmed)
}

function groupIntoRegions(items: PdfTextItem[]): TextRegion[] {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => {
    const yDiff = b.y - a.y
    if (Math.abs(yDiff) > 2) return yDiff
    return a.x - b.x
  })

  const regions: TextRegion[] = []
  let current: PdfTextItem[] = [sorted[0]]
  let currentY = sorted[0].y

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]
    const yGap = Math.abs(item.y - currentY)
    const avgHeight = (current[current.length - 1].height + item.height) / 2 || 12
    const prevText = current.map(c => c.str).join('').trim()
    const isBullet = isBulletLine(prevText)

    const onSameLine = yGap < avgHeight * 0.3
    const newParagraph = yGap > avgHeight * (isBullet ? 0.8 : 1.2)

    if (!onSameLine && newParagraph) {
      regions.push(makeRegion(current, regions.length))
      current = [item]
      currentY = item.y
    } else {
      if (!onSameLine) currentY = item.y
      current.push(item)
    }
  }
  if (current.length > 0) {
    regions.push(makeRegion(current, regions.length))
  }

  return regions
}

function makeRegion(items: PdfTextItem[], index: number): TextRegion {
  const minX = Math.min(...items.map(i => i.x))
  const maxX = Math.max(...items.map(i => i.x + i.width))
  const minY = Math.min(...items.map(i => i.y))
  const maxY = Math.max(...items.map(i => i.y + i.height))

  const mainItem = items.reduce((a, b) => a.fontSize >= b.fontSize ? a : b)
  const text = items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim()
  const fontName = readableFontName(mainItem.fontName)

  const region: TextRegion = {
    id: `r${index}`,
    items,
    text,
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 10),
    height: Math.max(maxY - minY, 10),
    fontName,
    fontSize: mainItem.fontSize,
    fontColor: '#000000',
    textAlign: 'left',
    edited: false,
    originalText: text,
    originalFontName: fontName,
    originalFontSize: mainItem.fontSize,
    originalFontColor: '#000000',
    confidence: 1,
  }

  if (isBulletLine(text)) {
    const firstItem = items[0]
    const indent = firstItem.x
    if (indent > 20) region.textAlign = 'left'
  }

  return region
}

const DEFAULT_FONTS: DocumentFontDefaults = {
  fontName: 'Helvetica',
  fontSize: 11,
  fontColor: '#000000',
  lineSpacing: 1.2,
}

export function usePdfTextRegions() {
  const [docData, setDocData] = useState<PdfDocumentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractRegions = useCallback(async (pdfDoc: any) => {
    setLoading(true)
    setError(null)
    try {
      const numPages = pdfDoc.numPages
      const pages: PdfDocumentData['pages'] = []

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 1 })
        const content = await page.getTextContent()

        const items: PdfTextItem[] = content.items
          .filter((item: PdfJsTextItem) => item.str.trim().length > 0)
          .map((item: PdfJsTextItem) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width || estimateFontSize(item.transform) * item.str.length * 0.5,
            height: item.height || estimateFontSize(item.transform) * 1.2,
            fontName: item.fontName || 'Unknown',
            fontSize: estimateFontSize(item.transform),
            transform: item.transform,
          }))

        const regions = groupIntoRegions(items)

        pages.push({
          pageNumber: i,
          width: viewport.width,
          height: viewport.height,
          regions,
        })
      }

      setDocData({ numPages, pages, isUploaded: true, fontDefaults: DEFAULT_FONTS })
    } catch (e: any) {
      setError(e.message || 'Failed to extract text regions')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateRegionText = useCallback((pageNum: number, regionId: string, newText: string) => {
    setDocData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        pages: prev.pages.map(p =>
          p.pageNumber !== pageNum ? p : {
            ...p,
            regions: p.regions.map(r =>
              r.id !== regionId ? r : { ...r, text: newText, edited: true }
            ),
          }
        ),
      }
    })
  }, [])

  const updateRegionStyle = useCallback((
    pageNum: number,
    regionId: string,
    style: Partial<Pick<TextRegion, 'fontName' | 'fontSize' | 'fontColor' | 'textAlign'>>
  ) => {
    setDocData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        pages: prev.pages.map(p =>
          p.pageNumber !== pageNum ? p : {
            ...p,
            regions: p.regions.map(r =>
              r.id !== regionId ? r : { ...r, ...style, edited: true }
            ),
          }
        ),
      }
    })
  }, [])

  const applyFontDefaults = useCallback((defaults: DocumentFontDefaults) => {
    setDocData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        fontDefaults: defaults,
        pages: prev.pages.map(p => ({
          ...p,
          regions: p.regions.map(r => ({
            ...r,
            fontName: r.edited ? r.fontName : defaults.fontName,
            fontSize: r.edited ? r.fontSize : defaults.fontSize,
            fontColor: r.edited ? r.fontColor : defaults.fontColor,
          })),
        })),
      }
    })
  }, [])

  const loadRegionData = useCallback((data: PdfDocumentData) => {
    setDocData(data)
  }, [])

  const getSerializable = useCallback((): PdfDocumentData | null => {
    return docData
  }, [docData])

  return {
    docData,
    loading,
    error,
    extractRegions,
    updateRegionText,
    updateRegionStyle,
    applyFontDefaults,
    loadRegionData,
    getSerializable,
  }
}
