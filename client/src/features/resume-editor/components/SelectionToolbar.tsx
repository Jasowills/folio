import { useState, useEffect, useRef } from 'react'
import { cn } from '../../../lib/utils'

interface SelectionToolbarProps {
  onRewrite: (text: string) => void
  onImprove: (text: string) => void
}

export default function SelectionToolbar({ onRewrite, onImprove }: SelectionToolbarProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseUp(e: MouseEvent) {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setVisible(false)
        return
      }
      const text = sel.toString().trim()
      if (text.length < 10) {
        setVisible(false)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelectedText(text)
      setPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 })
      setVisible(true)
    }

    function handleScroll() { setVisible(false) }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setVisible(false)
    }
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={ref}
      className="fixed z-50 flex items-center gap-0.5 bg-ink text-white rounded-lg shadow-lg px-1 py-1"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <button
        onClick={() => { onRewrite(selectedText); setVisible(false) }}
        className="px-2 py-1 text-[11px] font-medium text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap"
      >
        AI Rewrite
      </button>
      <button
        onClick={() => { onImprove(selectedText); setVisible(false) }}
        className="px-2 py-1 text-[11px] font-medium text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap"
      >
        Quick Improve
      </button>
    </div>
  )
}
