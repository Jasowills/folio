import { useState, useRef, useEffect, type KeyboardEvent } from 'react'

interface EditableFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
}

export default function EditableField({ value, onChange, placeholder, className = '', multiline }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  function handleStart() { setEditing(true); setDraft(value) }

  function handleFinish() {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
    }
    if (e.key === 'Escape') {
      setDraft(value)
      ;(e.target as HTMLElement).blur()
    }
  }

  if (editing) {
    const common = 'w-full bg-transparent border-0 border-b-2 border-teal outline-none p-0 resize-none'
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleFinish}
          onKeyDown={handleKeyDown}
          className={`${common} ${className}`}
          rows={2}
          placeholder={placeholder}
        />
      )
    }
    return (
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleFinish}
        onKeyDown={handleKeyDown}
        className={`${common} ${className}`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <span
      onClick={handleStart}
      className={`cursor-pointer hover:border-b-2 hover:border-teal/30 transition-colors ${!value ? 'text-muted/40 italic' : ''} ${className}`}
      title="Click to edit"
    >
      {value || placeholder || ''}
    </span>
  )
}
