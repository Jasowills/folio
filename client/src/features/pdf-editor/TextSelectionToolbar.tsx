import { useState, useEffect, useRef, useCallback } from 'react'
import { IconWand, IconBolt, IconX, IconMinus, IconPlus } from '@tabler/icons-react'

const MIN_SELECTION_LENGTH = 15
const HOLD_MS = 400

const FORMAT_FONTS = [
  { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, "Helvetica Neue", sans-serif' },
  { label: 'Times', value: '"Times New Roman", Georgia, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
  { label: 'Calibri', value: 'Calibri, "Helvetica Neue", Arial, sans-serif' },
]

const FORMAT_COLORS = [
  { label: 'Black', value: 'rgb(0,0,0)' },
  { label: 'Dark gray', value: 'rgb(55,65,81)' },
  { label: 'Slate', value: 'rgb(71,85,105)' },
  { label: 'Teal', value: '#0F6E56' },
  { label: 'Navy', value: '#1E3A5F' },
  { label: 'Burgundy', value: '#722F37' },
]

interface TextSelectionToolbarProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
  onRewrite: (text: string) => void
  onImprove: (text: string) => void
  onFormatBlock?: (blockId: string, updates: { fontFamily?: string; fontSize?: number; color?: string }) => void
}

function findBlockId(node: Node | null): string | null {
  let el = node instanceof HTMLElement ? node : node?.parentElement
  while (el) {
    if (el.dataset?.blockId) return el.dataset.blockId
    el = el.parentElement
  }
  return null
}

export default function TextSelectionToolbar({ canvasRef, onRewrite, onImprove, onFormatBlock }: TextSelectionToolbarProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [blockFontSize, setBlockFontSize] = useState(11)
  const [showFormat, setShowFormat] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const findBlockFontSize = useCallback((anchorNode: Node | null): number => {
    const blockId = findBlockId(anchorNode)
    if (!blockId || !canvasRef.current) return 11
    const blockEl = canvasRef.current.querySelector(`[data-block-id="${blockId}"]`)
    const contentEl = blockEl?.querySelector('[role="textbox"]') as HTMLElement | null
    if (contentEl) {
      const fs = parseFloat(getComputedStyle(contentEl).fontSize)
      if (!isNaN(fs)) return Math.round(fs * 100 / 72 * 10) / 10
    }
    return 11
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function handleMouseUp(_e: MouseEvent) {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setVisible(false)
        return
      }

      const text = sel.toString().trim()
      if (text.length < MIN_SELECTION_LENGTH) {
        setVisible(false)
        return
      }

      if (holdTimer.current) clearTimeout(holdTimer.current)
      holdTimer.current = window.setTimeout(() => {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const canvasRect = canvas!.getBoundingClientRect()

        const anchor = range.startContainer
        const blockId = findBlockId(anchor)
        const fontSize = findBlockFontSize(anchor)

        setSelectedText(text)
        setSelectedBlockId(blockId)
        setBlockFontSize(fontSize)
        setShowFormat(false)
        setPosition({
          top: rect.top - canvasRect.top - 8,
          left: rect.left - canvasRect.left + rect.width / 2,
        })
        setVisible(true)
      }, HOLD_MS)
    }

    function handleMouseDown(e: MouseEvent) {
      if (toolbarRef.current?.contains(e.target as Node)) return
      if (holdTimer.current) clearTimeout(holdTimer.current)
      setVisible(false)
    }

    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mousedown', handleMouseDown)
    return () => {
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mousedown', handleMouseDown)
    }
  }, [canvasRef, findBlockFontSize])

  function handleFormatChange(updates: { fontFamily?: string; fontSize?: number; color?: string }) {
    if (selectedBlockId && onFormatBlock) {
      onFormatBlock(selectedBlockId, updates)
    }
  }

  if (!visible) return null

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-border/50"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 px-1.5 py-1">
        <button
          onClick={() => { setVisible(false); onRewrite(selectedText) }}
          className="p-1 rounded text-muted hover:text-teal hover:bg-teal-light/20 transition-colors cursor-pointer"
          title="Rewrite with AI"
        >
          <IconWand className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { setVisible(false); onImprove(selectedText) }}
          className="p-1 rounded text-muted hover:text-teal hover:bg-teal-light/20 transition-colors cursor-pointer"
          title="Quick improve"
        >
          <IconBolt className="h-3.5 w-3.5" />
        </button>
        {onFormatBlock && selectedBlockId && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onClick={() => setShowFormat(f => !f)}
              className={`p-1 rounded transition-colors cursor-pointer ${showFormat ? 'text-teal bg-teal-light/20' : 'text-muted hover:text-teal hover:bg-teal-light/20'}`}
              title="Format text"
            >
              <span className="text-[11px] font-bold">A</span>
            </button>
          </>
        )}
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          onClick={() => setVisible(false)}
          className="p-1 rounded text-muted hover:text-danger transition-colors cursor-pointer"
          title="Dismiss"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>

      {showFormat && (
        <div className="border-t border-border px-2 py-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <label className="text-[9px] text-muted w-10 shrink-0">Font</label>
            <select
              onChange={(e) => handleFormatChange({ fontFamily: e.target.value })}
              className="flex-1 text-[10px] bg-paper border border-border rounded px-1.5 py-0.5 text-ink focus:outline-none focus:border-teal cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>Change...</option>
              {FORMAT_FONTS.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[9px] text-muted w-10 shrink-0">Size</label>
            <button
              onClick={() => {
                const newSize = Math.max(6, Math.round((blockFontSize - 0.5) * 10) / 10)
                setBlockFontSize(newSize)
                handleFormatChange({ fontSize: newSize })
              }}
              className="p-0.5 rounded text-muted hover:text-ink hover:bg-paper transition-colors cursor-pointer"
            >
              <IconMinus className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-ink w-8 text-center font-mono">{blockFontSize.toFixed(1)}</span>
            <button
              onClick={() => {
                const newSize = Math.min(24, Math.round((blockFontSize + 0.5) * 10) / 10)
                setBlockFontSize(newSize)
                handleFormatChange({ fontSize: newSize })
              }}
              className="p-0.5 rounded text-muted hover:text-ink hover:bg-paper transition-colors cursor-pointer"
            >
              <IconPlus className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[9px] text-muted w-10 shrink-0">Color</label>
            <div className="flex gap-1">
              {FORMAT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => handleFormatChange({ color: c.value })}
                  className="w-4 h-4 rounded-full border border-border hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
