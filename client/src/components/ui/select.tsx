import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../../lib/utils'

interface Option {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export function Select({ value, onChange, options, placeholder = 'Select...', className }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const handleSelect = useCallback((val: string) => {
    onChange(val)
    setOpen(false)
  }, [onChange])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-field w-full flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className={cn(value ? 'text-ink' : 'text-muted-light')}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={cn('text-muted shrink-0 transition-transform duration-200', open && 'rotate-180')}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-border rounded-lg shadow-modal py-1 max-h-[240px] overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">No options</p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer',
                  opt.value === value
                    ? 'text-teal bg-teal-light/20 font-medium'
                    : 'text-ink hover:bg-paper',
                )}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
