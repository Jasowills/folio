import { useState, useCallback, useEffect, useRef } from 'react'
import type { PdfLayoutDocument, PdfLayoutPage } from '../../lib/queries'
import PdfPageRenderer from './PdfPageRenderer'
import TextSelectionToolbar from './TextSelectionToolbar'
import { usePdfUndo } from './hooks/usePdfUndo'
import { usePdfReflow } from './hooks/usePdfReflow'
import { usePdfPageRenderer } from './hooks/usePdfPageRenderer'

interface PdfDocumentEditorProps {
  layoutDocument: PdfLayoutDocument
  onSave: (updatedDoc: PdfLayoutDocument) => void
  onAiRewrite?: (text: string) => void
  onAiImprove?: (text: string) => void
  issues?: Array<{ message: string; severity: 'low' | 'medium' | 'high'; section: string }>
  zoom?: number
  onZoomChange?: (zoom: number) => void
  fileUrl?: string
  debugMode?: boolean
  debugOpacity?: number
}

let blockCounter = Date.now()

export default function PdfDocumentEditor({ layoutDocument, onSave, onAiRewrite, onAiImprove, issues, zoom: externalZoom, onZoomChange, fileUrl, debugMode: externalDebug, debugOpacity: externalOpacity }: PdfDocumentEditorProps) {
  const [pages, setPages] = useState<PdfLayoutPage[]>(layoutDocument.pages)
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [internalZoom, setInternalZoom] = useState(1)
  const [debugOpacity, setDebugOpacity] = useState(externalOpacity ?? 0.4)
  const debugMode = externalDebug ?? false
  const zoom = externalZoom ?? internalZoom
  const setZoom = onZoomChange ?? setInternalZoom
  const prevPages = useRef(pages)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null!)

  const { pageImages, loading: pdfLoading } = usePdfPageRenderer(
    fileUrl,
    layoutDocument.pageCount,
    !!debugMode,
  )

  const issueMap = useRef<Map<string, { severity: 'amber' | 'danger'; message: string }>>(new Map())
  useEffect(() => {
    const map = new Map<string, { severity: 'amber' | 'danger'; message: string }>()
    if (issues) {
      for (const issue of issues) {
        const severity = issue.severity === 'high' ? 'danger' : 'amber'
        const keywords = issue.message.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5)
        if (keywords.length === 0) continue
        for (const page of pages) {
          for (const block of page.blocks) {
            const blockLower = block.text.toLowerCase()
            const matchCount = keywords.filter(k => blockLower.includes(k)).length
            if (matchCount >= Math.min(2, keywords.length)) {
              map.set(block.id, { severity, message: issue.message })
            }
          }
        }
      }
    }
    issueMap.current = map
  }, [issues, pages])

  const { pushSnapshot, undo, redo } = usePdfUndo()
  const { registerRef, reflow } = usePdfReflow()

  useEffect(() => {
    setPages(layoutDocument.pages)
  }, [layoutDocument.pages])

  const scheduleSave = useCallback((updatedPages: PdfLayoutPage[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave({ ...layoutDocument, pages: updatedPages })
    }, 1500)
  }, [layoutDocument, onSave])

  const handleBlockFocus = useCallback((blockId: string) => {
    setFocusedBlockId(blockId)
  }, [])

  const handleBlockBlur = useCallback((blockId: string, newText: string) => {
    setFocusedBlockId(null)
    setPages(prev => {
      const updated = prev.map(page => ({
        ...page,
        blocks: page.blocks.map(b =>
          b.id === blockId ? { ...b, text: newText } : b
        ),
      }))
      const reflowed = updated.map(page => ({
        ...page,
        blocks: reflow(page.blocks),
      }))
      pushSnapshot(prevPages.current)
      prevPages.current = reflowed
      scheduleSave(reflowed)
      return reflowed
    })
  }, [reflow, pushSnapshot, scheduleSave])

  const handleDeleteBlock = useCallback((pageNumber: number, blockId: string) => {
    setPages(prev => {
      const updated = prev.map(page =>
        page.pageNumber === pageNumber
          ? { ...page, blocks: page.blocks.filter(b => b.id !== blockId) }
          : page
      )
      pushSnapshot(prevPages.current)
      prevPages.current = updated
      scheduleSave(updated)
      return updated
    })
  }, [pushSnapshot, scheduleSave])

  const handleMoveBlock = useCallback((pageNumber: number, blockId: string, x: number, y: number) => {
    setPages(prev => {
      const updated = prev.map(page =>
        page.pageNumber === pageNumber
          ? { ...page, blocks: page.blocks.map(b => b.id === blockId ? { ...b, x, y } : b) }
          : page
      )
      return updated
    })
  }, [])

  const handleResizeBlock = useCallback((pageNumber: number, blockId: string, width: number, height: number) => {
    setPages(prev => {
      const updated = prev.map(page =>
        page.pageNumber === pageNumber
          ? { ...page, blocks: page.blocks.map(b => b.id === blockId ? { ...b, width, height } : b) }
          : page
      )
      return updated
    })
  }, [])

  const handleAddBlock = useCallback((pageNumber: number) => {
    const nextId = `b_${++blockCounter}`
    setPages(prev => {
      const page = prev.find(p => p.pageNumber === pageNumber)
      if (!page) return prev
      const lastBlock = page.blocks.length > 0 ? page.blocks[page.blocks.length - 1] : null
      const y = lastBlock ? lastBlock.y + lastBlock.height + 6 : 40
      const newBlock = {
        id: nextId,
        text: '',
        x: 50,
        y,
        width: page.width - 100,
        height: 18,
        fontSize: layoutDocument.dominantFontSize || 11,
        fontWeight: 400 as const,
        fontStyle: 'normal' as const,
        fontFamily: layoutDocument.dominantFontFamily || 'sans-serif',
        color: 'rgb(0,0,0)',
        isAllCaps: false,
        isLikelyHeading: false,
        lineCount: 1,
        lineHeight: null,
      }
      const updated = prev.map(p =>
        p.pageNumber === pageNumber
          ? { ...p, blocks: [...p.blocks, newBlock] }
          : p
      )
      pushSnapshot(prevPages.current)
      prevPages.current = updated
      scheduleSave(updated)
      return updated
    })
  }, [layoutDocument, pushSnapshot, scheduleSave])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const restored = undo(pages)
        if (restored) {
          setPages(restored)
          prevPages.current = restored
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        const restored = redo(pages)
        if (restored) {
          setPages(restored)
          prevPages.current = restored
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pages, undo, redo])

  useEffect(() => {
    const ref = canvasRef.current
    if (!ref) return
    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const currentZoom = zoom
        setZoom(Math.max(0.25, Math.min(2, currentZoom + delta)))
      }
    }
    ref.addEventListener('wheel', handleWheel, { passive: false })
    return () => ref.removeEventListener('wheel', handleWheel)
  }, [setZoom])

  const scale = zoom

  const handleAiRewrite = onAiRewrite || (() => {})
  const handleAiImprove = onAiImprove || (() => {})

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-auto bg-[#D4CFC6] relative"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {debugMode && pdfLoading && (
        <div className="fixed top-14 right-4 bg-blue-600 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg z-50 animate-pulse">
          Rendering original PDF pages...
        </div>
      )}

      <div
        className="flex flex-col items-center py-10 min-h-full"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        {pages.map((page) => (
          <PdfPageRenderer
            key={page.pageNumber}
            page={page}
            focusedBlockId={focusedBlockId}
            onBlockFocus={handleBlockFocus}
            onBlockBlur={handleBlockBlur}
            onReflowRef={registerRef}
            issueMap={issueMap.current}
            zoom={zoom}
            onDeleteBlock={handleDeleteBlock}
            onMoveBlock={handleMoveBlock}
            onResizeBlock={handleResizeBlock}
            onAddBlock={handleAddBlock}
            debugMode={debugMode}
            debugBackground={pageImages[page.pageNumber - 1] ?? null}
            debugOpacity={debugOpacity}
          />
        ))}
      </div>

      {debugMode && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white rounded-xl shadow-2xl flex items-center gap-4 px-4 py-2.5 z-50 select-none"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <span className="text-[11px] font-medium text-gray-300 whitespace-nowrap">Original PDF</span>
          <input
            type="range"
            min="0.05"
            max="0.9"
            step="0.05"
            value={debugOpacity}
            onChange={(e) => setDebugOpacity(parseFloat(e.target.value))}
            className="w-24 h-1 accent-teal cursor-pointer"
          />
          <span className="text-[11px] font-mono text-gray-400 w-8">{Math.round(debugOpacity * 100)}%</span>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex items-center gap-2 text-[11px] text-gray-300">
            <span className="inline-block w-3 h-3 rounded border border-dashed border-blue-400 bg-blue-50/20" />
            <span>Blocks</span>
          </div>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => {
              const lines: string[] = []
              for (const p of pages) {
                lines.push(`--- Page ${p.pageNumber} (${p.width}x${p.height}pt) ---`)
                for (const b of p.blocks) {
                  lines.push(`[${b.id}] x=${b.x} y=${b.y} w=${b.width} h=${b.height} fs=${b.fontSize} fw=${b.fontWeight} ff=${b.fontFamily}: ${b.text}`)
                }
              }
              navigator.clipboard?.writeText(lines.join('\n')).catch(() => {})
            }}
            className="text-[11px] text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors cursor-pointer font-mono"
            title="Copy all block texts with position info"
          >
            Copy all
          </button>
          <button
            onClick={() => {
              const lines: string[] = []
              for (const p of pages) {
                lines.push(`Page ${p.pageNumber}:`)
                for (const b of p.blocks) {
                  lines.push(`  ${b.text}`)
                }
              }
              navigator.clipboard?.writeText(lines.join('\n')).catch(() => {})
            }}
            className="text-[11px] text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors cursor-pointer font-mono"
            title="Copy plain text only (no metadata)"
          >
            Copy text
          </button>
        </div>
      )}

      <TextSelectionToolbar
        canvasRef={canvasRef}
        onRewrite={handleAiRewrite}
        onImprove={handleAiImprove}
      />
    </div>
  )
}
