import { useState, useRef, useEffect, useCallback } from 'react'
import type { PdfLayoutBlock } from '../../lib/queries'
import { mapCanvasFont } from './utils/fontMap'

interface PdfBlockProps {
  block: PdfLayoutBlock
  isFocused: boolean
  onFocus: () => void
  onBlur: (newText: string) => void
  onReflowRef: (blockId: string, el: HTMLDivElement | null) => void
  issueSeverity?: 'amber' | 'danger' | null
  issueMessage?: string | null
  zoom: number
  onDelete: (blockId: string) => void
  onMove: (blockId: string, x: number, y: number) => void
  onResize: (blockId: string, width: number, height: number) => void
}

const PT_PER_PX = 72 / 96

export default function PdfBlock({
  block,
  isFocused,
  onFocus,
  onBlur,
  onReflowRef,
  issueSeverity,
  zoom,
  onDelete,
  onMove,
  onResize,
}: PdfBlockProps) {
  const [editing, setEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const savedText = useRef(block.text)
  const ref = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const resizeState = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null)

  useEffect(() => {
    savedText.current = block.text
  }, [block.text])

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [editing])

  useEffect(() => {
    if (ref.current) onReflowRef(block.id, ref.current)
    return () => onReflowRef(block.id, null)
  }, [block.id, block.text, onReflowRef])

  function handleFocus() {
    onFocus()
    setEditing(true)
  }

  function handleBlur() {
    setEditing(false)
    const trimmed = (ref.current?.textContent || '').trim()
    if (trimmed !== savedText.current) {
      savedText.current = trimmed
      onBlur(trimmed)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      if (ref.current) ref.current.textContent = savedText.current
      ref.current?.blur()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const isSingleLine = block.lineCount === 1 || !ref.current?.textContent?.includes('\n')
      if (isSingleLine) {
        e.preventDefault()
        ref.current?.blur()
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (block.text === '' || !ref.current?.textContent?.trim()) {
        e.preventDefault()
        onDelete(block.id)
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragState.current = { sx: e.clientX, sy: e.clientY, ox: block.x, oy: block.y }

    function handleDragMove(ev: MouseEvent) {
      if (!dragState.current) return
      const dx = (ev.clientX - dragState.current.sx) * PT_PER_PX / zoom
      const dy = (ev.clientY - dragState.current.sy) * PT_PER_PX / zoom
      onMove(block.id, Math.max(0, dragState.current.ox + dx), Math.max(0, dragState.current.oy + dy))
    }

    function onUp() {
      dragState.current = null
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', onUp)
  }, [block.id, block.x, block.y, zoom, onMove])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeState.current = { sx: e.clientX, sy: e.clientY, ow: block.width, oh: block.height }

    function onMove(ev: MouseEvent) {
      if (!resizeState.current) return
      const dw = (ev.clientX - resizeState.current.sx) * PT_PER_PX / zoom
      const dh = (ev.clientY - resizeState.current.sy) * PT_PER_PX / zoom
      onResize(block.id, Math.max(10, resizeState.current.ow + dw), Math.max(10, resizeState.current.oh + dh))
    }

    function onUp() {
      resizeState.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [block.id, block.width, block.height, zoom, onResize])

  const issueClass = issueSeverity === 'danger'
    ? 'bg-[rgba(155,35,53,0.06)] border-l-2 border-[#9B2335]'
    : issueSeverity === 'amber'
      ? 'bg-[rgba(186,117,23,0.06)] border-l-2 border-[#BA7517]'
      : ''

  const focusClass = isFocused
    ? 'bg-[rgba(15,110,86,0.04)] border-l-[1.5px] border-teal'
    : ''

  const showControls = isHovered || isFocused

  return (
    <div
      style={{
        position: 'absolute',
        left: `${block.x}pt`,
        top: `${block.y}pt`,
        width: `${block.width}pt`,
        minHeight: `${block.height}pt`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        style={{
          position: 'absolute',
          left: '-8px',
          top: 0,
          bottom: 0,
          width: '6px',
          cursor: 'grab',
          borderRadius: '3px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.12s',
          background: isFocused ? 'rgba(15,110,86,0.4)' : 'rgba(0,0,0,0.15)',
        }}
      />

      {/* Delete button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onDelete(block.id) }}
        style={{
          position: 'absolute',
          right: '-8px',
          top: '-8px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(155,35,53,0.9)',
          color: '#fff',
          fontSize: '10px',
          lineHeight: '18px',
          textAlign: 'center',
          cursor: 'pointer',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.12s',
          zIndex: 10,
        }}
        title="Delete block"
      >
        ✕
      </button>

      {/* Block content */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`outline-none cursor-text transition-none ${issueClass} ${focusClass}`}
        style={{
          fontSize: `${block.fontSize}pt`,
          fontWeight: block.fontWeight,
          fontStyle: block.fontStyle,
          fontFamily: mapCanvasFont(block.fontFamily),
          color: block.color,
          lineHeight: 1.25,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          padding: '1px 4px',
          margin: 0,
          minHeight: `${block.height}pt`,
          borderLeft: issueClass || focusClass ? undefined : '1.5px solid transparent',
        }}
      >
        {block.text}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '14px',
          height: '14px',
          cursor: 'nwse-resize',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.12s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M14 0v14H0" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
          <path d="M14 6v8H6" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
        </svg>
      </div>
    </div>
  )
}
