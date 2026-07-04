import { useState, useRef, useEffect } from 'react'
import { cn } from '../../../lib/utils'
import type { TextRegion, DocumentFontDefaults } from '../types/pdf'

interface TextRegionBlockProps {
  region: TextRegion
  pageNumber: number
  fontDefaults: DocumentFontDefaults
  isSelected: boolean
  onSelect: () => void
  onUpdateText: (pageNum: number, regionId: string, text: string) => void
}

export default function TextRegionBlock({ region, pageNumber, fontDefaults, isSelected, onSelect, onUpdateText }: TextRegionBlockProps) {
  const [editing, setEditing] = useState(false)
  const savedText = useRef(region.text)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    savedText.current = region.text
  }, [region.text])

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

  function handleBlur() {
    setEditing(false)
    const trimmed = (ref.current?.textContent || '').trim()
    if (trimmed !== savedText.current) {
      onUpdateText(pageNumber, region.id, trimmed)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      if (ref.current) ref.current.textContent = savedText.current
      ref.current?.blur()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ref.current?.blur()
    }
  }

  const isEdited = region.edited
  const activeFontName = isEdited ? region.fontName : fontDefaults.fontName
  const activeFontSize = isEdited ? region.fontSize : fontDefaults.fontSize
  const activeFontColor = isEdited ? region.fontColor : fontDefaults.fontColor

  return (
    <div className={cn('group relative w-full transition-all', editing && 'z-10')}>
      <div
        ref={ref}
        contentEditable={editing}
        suppressContentEditableWarning
        role="textbox"
        tabIndex={0}
        onFocus={() => { onSelect(); setEditing(true) }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full outline-none rounded-sm px-0.5 transition-all',
          editing
            ? 'bg-teal-light/20 ring-2 ring-teal/50'
            : isSelected
              ? 'ring-2 ring-teal/40 bg-teal-light/10'
              : 'hover:ring-1 hover:ring-teal/30 hover:bg-teal-light/5',
        )}
        style={{
          fontFamily: `"${activeFontName}", Helvetica, Arial, sans-serif`,
          fontSize: `${activeFontSize}px`,
          color: activeFontColor,
          textAlign: region.textAlign,
          lineHeight: fontDefaults.lineSpacing,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {region.text}
      </div>
      {!editing && (
        <div className="absolute -bottom-px left-1 right-0 h-px bg-teal/30 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" />
      )}
    </div>
  )
}
