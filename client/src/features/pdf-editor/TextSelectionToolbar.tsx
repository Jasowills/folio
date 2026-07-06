import { useState, useEffect, useRef } from 'react'
import { IconWand, IconBolt, IconX } from '@tabler/icons-react'

const MIN_SELECTION_LENGTH = 15
const HOLD_MS = 400

interface TextSelectionToolbarProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
  onRewrite: (text: string) => void
  onImprove: (text: string) => void
}

export default function TextSelectionToolbar({ canvasRef, onRewrite, onImprove }: TextSelectionToolbarProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState('')
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

        setSelectedText(text)
        setPosition({
          top: rect.top - canvasRect.top - 8,
          left: rect.left - canvasRect.left + rect.width / 2,
        })
        setVisible(true)
      }, HOLD_MS)
    }

    function handleMouseDown() {
      if (holdTimer.current) clearTimeout(holdTimer.current)
      setVisible(false)
    }

    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mousedown', handleMouseDown)
    return () => {
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mousedown', handleMouseDown)
    }
  }, [canvasRef])

  if (!visible) return null

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-border/50 px-1.5 py-1"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
      }}
    >
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
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        onClick={() => setVisible(false)}
        className="p-1 rounded text-muted hover:text-danger transition-colors cursor-pointer"
        title="Dismiss"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
