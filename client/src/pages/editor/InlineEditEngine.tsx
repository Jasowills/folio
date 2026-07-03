import { useRef, useState, useEffect } from 'react'
import type { LocalData } from './types'
import { IconWand, IconSparkles, IconX, IconGripVertical, IconTrash, IconPlus } from '@tabler/icons-react'

interface HoverState {
  type: 'name' | 'email' | 'phone' | 'location' | 'summary' | 'job-title' | 'company' | 'bullet' | 'date' | 'education' | 'skill' | 'certification' | 'language'
  section?: string
  sectionIndex?: number
  bulletIndex?: number
  skillIndex?: number
}

interface Props {
  localData: LocalData
  onUpdate: (data: LocalData) => void
  onOpenAiDrawer?: (section: string, text: string) => void
  editMode: 'guided' | 'direct'
}

export function InlineEditEngine({ localData, onUpdate, editMode }: Props) {
  const [hoveredElement, setHoveredElement] = useState<HoverState | null>(null)
  const [editingElement, setEditingElement] = useState<HoverState | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectionToolbar, setSelectionToolbar] = useState<{ x: number; y: number; text: string } | null>(null)
  const editRef = useRef<HTMLDivElement>(null)
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!editMode || editMode !== 'direct') return
    function onMouseDown(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        commitEdit()
      }
    }
    function onMouseUp(e: MouseEvent) {
      if (editingElement) return
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current)
      selectionTimerRef.current = setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString() || sel.toString().length < 3) {
          setSelectionToolbar(null)
          return
        }
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setSelectionToolbar({ x: rect.left + rect.width / 2, y: rect.top - 8, text: sel.toString() })
      }, 400)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [editMode, editingElement])

  function startEdit(state: HoverState, currentValue: string) {
    setEditingElement(state)
    setEditValue(currentValue)
    setSelectionToolbar(null)
  }

  function commitEdit() {
    if (!editingElement) return
    const clone = structuredClone(localData)
    const s = editingElement
    switch (s.type) {
      case 'name': clone.name = editValue; break
      case 'email': clone.contact.email = editValue; break
      case 'phone': clone.contact.phone = editValue; break
      case 'location': clone.contact.location = editValue; break
      case 'summary': clone.summary = editValue; break
      case 'job-title':
        if (s.sectionIndex !== undefined) clone.experience[s.sectionIndex].title = editValue
        break
      case 'company':
        if (s.sectionIndex !== undefined) clone.experience[s.sectionIndex].company = editValue
        break
      case 'bullet':
        if (s.sectionIndex !== undefined && s.bulletIndex !== undefined)
          clone.experience[s.sectionIndex].bullets[s.bulletIndex] = editValue
        break
      case 'date':
        if (s.sectionIndex !== undefined) {
          const parts = editValue.split(' — ')
          clone.experience[s.sectionIndex].startDate = parts[0] || ''
          clone.experience[s.sectionIndex].endDate = parts[1]?.replace('Present', '') || ''
          clone.experience[s.sectionIndex].current = parts[1]?.includes('Present') || false
        }
        break
    }
    onUpdate(clone)
    setEditingElement(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setEditingElement(null)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
    }
  }

  const Editable = ({ state, value, className, placeholder, multiline }: {
    state: HoverState
    value: string
    className?: string
    placeholder?: string
    multiline?: boolean
  }) => {
    const isActive = editingElement?.type === state.type && editingElement?.sectionIndex === state.sectionIndex && editingElement?.bulletIndex === state.bulletIndex
    const isHovered = hoveredElement?.type === state.type && hoveredElement?.sectionIndex === state.sectionIndex && hoveredElement?.bulletIndex === state.bulletIndex

    if (isActive) {
      const Tag = multiline ? 'div' : 'div'
      return (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          className={cn('outline-none border border-teal rounded px-1 -mx-1', multiline ? 'whitespace-pre-wrap min-h-[2em]' : '')}
          style={{ fontSize: 'inherit', fontFamily: 'inherit', lineHeight: 'inherit' }}
          onInput={e => setEditValue((e.target as HTMLElement).textContent || '')}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          dangerouslySetInnerHTML={{ __html: editValue }}
        />
      )
    }

    return (
      <span
        className={cn(
          'relative group/cursor',
          className,
          isHovered && 'ring-1 ring-teal/40 rounded',
          'cursor-text',
        )}
        onMouseEnter={() => setHoveredElement(state)}
        onMouseLeave={() => setHoveredElement(null)}
        onClick={() => startEdit(state, value)}
      >
        {value || <span className="text-muted/40 italic">{placeholder || 'Click to edit'}</span>}
        {isHovered && (
          <span className="absolute -top-5 left-0 text-[9px] px-1.5 py-0.5 rounded bg-ink text-white whitespace-nowrap opacity-80 pointer-events-none">
            Click to edit
          </span>
        )}
      </span>
    )
  }

  const SelectionToolbarComponent = selectionToolbar ? (
    <div
      className="fixed z-[100] flex items-center gap-0.5 bg-ink rounded-lg shadow-lg px-1 py-1"
      style={{ left: selectionToolbar.x, top: selectionToolbar.y, transform: 'translate(-50%, -100%)' }}
    >
      <button className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" title="Rewrite with AI">
        <IconWand className="h-3.5 w-3.5" />
      </button>
      <button className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" title="Improve this">
        <IconSparkles className="h-3.5 w-3.5" />
      </button>
      <span className="w-px h-4 bg-white/10 mx-0.5" />
      <button onClick={() => setSelectionToolbar(null)} className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
        <IconX className="h-3 w-3" />
      </button>
    </div>
  ) : null

  const AddButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="opacity-0 group-hover/add:opacity-100 absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-teal text-white flex items-center justify-center hover:bg-teal-dark transition-all cursor-pointer"
      title="Add item"
    >
      <IconPlus className="h-2.5 w-2.5" />
    </button>
  )

  const DeleteButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="opacity-0 group-hover/delete:opacity-100 absolute -right-5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-danger transition-all cursor-pointer"
      title="Delete"
    >
      <IconTrash className="h-3 w-3" />
    </button>
  )

  const DragHandle = () => (
    <span className="opacity-0 group-hover/drag:opacity-100 absolute -left-6 top-1/2 -translate-y-1/2 text-muted cursor-grab">
      <IconGripVertical className="h-3.5 w-3.5" />
    </span>
  )

  return { Editable, SelectionToolbarComponent, selectionToolbar, editingElement, startEdit, commitEdit, AddButton, DeleteButton, DragHandle }
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function renderContact(
  Editable: ReturnType<typeof InlineEditEngine>['Editable'],
  localData: LocalData,
) {
  const parts: string[] = []
  if (localData.contact.email) {
    parts.push(Editable({ state: { type: 'email' }, value: localData.contact.email, className: 'inline' }))
  }
  if (localData.contact.phone) {
    parts.push(Editable({ state: { type: 'phone' }, value: localData.contact.phone, className: 'inline' }))
  }
  if (localData.contact.location) {
    parts.push(Editable({ state: { type: 'location' }, value: localData.contact.location, className: 'inline' }))
  }
  return parts.length > 0 ? (
    <span>{parts.map((p, i) => (<span key={i}>{i > 0 ? ' | ' : ''}{p}</span>))}</span>
  ) : (
    Editable({ state: { type: 'email' }, value: '', placeholder: 'email@example.com', className: 'inline' })
  )
}
