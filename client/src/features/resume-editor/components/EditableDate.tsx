import { useState, useRef, useEffect } from 'react'

interface EditableDateProps {
  startDate?: string
  endDate?: string
  current?: boolean
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onCurrentChange: (value: boolean) => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toDisplayDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const parts = iso.split('-')
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[1], 10) - 1
    if (monthIdx >= 0 && monthIdx < 12) return `${MONTHS[monthIdx]} ${parts[0]}`
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return parts[0]
  return iso
}

function fromDisplayDate(display?: string): string | undefined {
  if (!display) return undefined
  const trimmed = display.trim()
  if (!trimmed) return undefined
  const parts = trimmed.split(/\s+/)
  if (parts.length === 2) {
    const monthIdx = MONTHS.indexOf(parts[0])
    if (monthIdx >= 0) return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`
    // parts[0] isn't a valid month — check if it's a year (purely digits)
    if (/^\d{4}$/.test(parts[0])) return parts[0]
    if (/^\d{4}$/.test(parts[1])) return parts[1]
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return parts[0]
  return trimmed
}

function parseDisplayDate(iso?: string | null): { month: string; year: string } {
  if (!iso) return { month: '', year: '' }
  const parts = iso.split('-')
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[1], 10) - 1
    return { month: monthIdx >= 0 && monthIdx < 12 ? MONTHS[monthIdx] : '', year: parts[0] }
  }
  const spaceParts = iso.split(' ')
  if (spaceParts.length === 2) return { month: spaceParts[0], year: spaceParts[1] }
  return { month: '', year: iso }
}

export default function EditableDate({ startDate, endDate, current, onStartDateChange, onEndDateChange, onCurrentChange }: EditableDateProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const display = [toDisplayDate(startDate), current ? 'Present' : toDisplayDate(endDate)].filter(Boolean).join(' \u2014 ')

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-[9px] text-muted hover:text-ink hover:bg-paper-dark px-1 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap"
      >
        {display || '+ Add dates'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-border rounded-lg shadow-lg p-3 w-64">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-muted block mb-1">Start</label>
              <div className="flex gap-1">
                {(() => { const sd = parseDisplayDate(startDate); return (
                <>
                <select
                  value={sd.month}
                  onChange={e => onStartDateChange(fromDisplayDate(`${e.target.value} ${sd.year || '2024'}`) || '')}
                  className="flex-1 text-[11px] border border-border rounded px-2 py-1 bg-paper"
                >
                  <option value="">Month</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="number"
                  value={sd.year}
                  onChange={e => onStartDateChange(fromDisplayDate(`${sd.month || 'Jan'} ${e.target.value}`) || '')}
                  placeholder="Year"
                  className="w-20 text-[11px] border border-border rounded px-2 py-1 bg-paper"
                  min="1950"
                  max="2030"
                />
                </>
                ) })()}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-muted mb-1">
                <input
                  type="checkbox"
                  checked={current}
                  onChange={e => onCurrentChange(e.target.checked)}
                  className="rounded"
                />
                Currently here
              </label>
              {!current && (
                <div className="flex gap-1">
                  {(() => { const ed = parseDisplayDate(endDate); return (
                  <>
                  <select
                    value={ed.month}
                    onChange={e => onEndDateChange(fromDisplayDate(`${e.target.value} ${ed.year || '2024'}`) || '')}
                    className="flex-1 text-[11px] border border-border rounded px-2 py-1 bg-paper"
                  >
                    <option value="">Month</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input
                    type="number"
                    value={ed.year}
                    onChange={e => onEndDateChange(fromDisplayDate(`${ed.month || 'Jan'} ${e.target.value}`) || '')}
                    placeholder="Year"
                    className="w-20 text-[11px] border border-border rounded px-2 py-1 bg-paper"
                    min="1950"
                    max="2030"
                  />
                  </>
                  ) })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
