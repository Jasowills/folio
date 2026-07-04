import { useState, useRef, useEffect } from 'react'
import { IconDots, IconArrowUp, IconArrowDown, IconCopy, IconTrash, IconEyeOff } from '@tabler/icons-react'

interface SectionMenuProps {
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onRemove: () => void
  onHide: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

export default function SectionMenu({ onMoveUp, onMoveDown, onDuplicate, onRemove, onHide, canMoveUp, canMoveDown }: SectionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const items = [
    { label: 'Move up', icon: IconArrowUp, action: onMoveUp, disabled: !canMoveUp },
    { label: 'Move down', icon: IconArrowDown, action: onMoveDown, disabled: !canMoveDown },
    { label: 'Duplicate', icon: IconCopy, action: onDuplicate, disabled: false },
    { label: 'Hide', icon: IconEyeOff, action: onHide, disabled: false },
    { label: 'Remove', icon: IconTrash, action: onRemove, disabled: false },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded text-muted/40 hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
        title="Section options"
      >
        <IconDots className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-0.5 z-40 w-36 bg-white border border-border rounded-lg shadow-lg py-1">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <button
                key={i}
                onClick={() => { if (!item.disabled) { item.action(); setOpen(false) } }}
                disabled={item.disabled}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-ink hover:bg-paper-dark transition-colors disabled:opacity-30 cursor-pointer"
              >
                <Icon className="h-3 w-3 text-muted" />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
