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

  const display = [startDate, current ? 'Present' : endDate].filter(Boolean).join(' \u2014 ')

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
                <select
                  value={startDate?.split(' ')[0] || ''}
                  onChange={e => onStartDateChange(`${e.target.value} ${startDate?.split(' ')[1] || '2024'}`)}
                  className="flex-1 text-[11px] border border-border rounded px-2 py-1 bg-paper"
                >
                  <option value="">Month</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="number"
                  value={startDate?.split(' ')[1] || ''}
                  onChange={e => onStartDateChange(`${startDate?.split(' ')[0] || 'Jan'} ${e.target.value}`)}
                  placeholder="Year"
                  className="w-20 text-[11px] border border-border rounded px-2 py-1 bg-paper"
                  min="1950"
                  max="2030"
                />
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
                  <select
                    value={endDate?.split(' ')[0] || ''}
                    onChange={e => onEndDateChange(`${e.target.value} ${endDate?.split(' ')[1] || '2024'}`)}
                    className="flex-1 text-[11px] border border-border rounded px-2 py-1 bg-paper"
                  >
                    <option value="">Month</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input
                    type="number"
                    value={endDate?.split(' ')[1] || ''}
                    onChange={e => onEndDateChange(`${endDate?.split(' ')[0] || 'Jan'} ${e.target.value}`)}
                    placeholder="Year"
                    className="w-20 text-[11px] border border-border rounded px-2 py-1 bg-paper"
                    min="1950"
                    max="2030"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
