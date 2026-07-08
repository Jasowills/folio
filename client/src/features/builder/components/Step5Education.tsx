import { useState } from 'react'
import type { EducationEntry } from '../types'

interface Props {
  data: EducationEntry[]
  onSave: (data: EducationEntry[]) => void
  onChange?: (entries: EducationEntry[]) => void
}

const DEGREES = ['BSc', 'BA', 'BEng', 'MSc', 'MA', 'MBA', 'PhD', 'HND', 'Bootcamp', 'Certification', 'Other']

function emptyEntry(): EducationEntry {
  return { degree: '', field: '', institution: '', startYear: '', endYear: '', inProgress: false, gpa: '' }
}

export default function Step5Education({ data, onSave, onChange }: Props) {
  const [entries, setEntries] = useState<EducationEntry[]>(data.length > 0 ? data : [emptyEntry()])

  const update = (i: number, field: keyof EducationEntry, value: string | boolean) => {
    const next = entries.map((e, j) => j === i ? { ...e, [field]: value } : e)
    setEntries(next)
    onChange?.(next)
  }

  const add = () => setEntries(prev => { const n = [...prev, emptyEntry()]; onChange?.(n); return n })
  const remove = (i: number) => setEntries(prev => { const n = prev.filter((_, j) => j !== i); onChange?.(n); return n })

  const valid = entries.some(e => e.degree && e.field && e.institution)

  return (
    <div className="p-6 space-y-5">
      {entries.map((entry, i) => (
        <div key={i} className="p-4 bg-paper rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-ink">Education {i + 1}</span>
            {entries.length > 1 && (
              <button onClick={() => remove(i)} className="text-[10px] text-danger/70 hover:text-danger transition-colors">Remove</button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted mb-1 block">Degree</label>
              <select
                value={entry.degree}
                onChange={e => update(i, 'degree', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal appearance-none"
              >
                <option value="">Select...</option>
                {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">Field of study</label>
              <input
                value={entry.field}
                onChange={e => update(i, 'field', e.target.value)}
                placeholder="Computer Science"
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted mb-1 block">Institution</label>
            <input
              value={entry.institution}
              onChange={e => update(i, 'institution', e.target.value)}
              placeholder="Stanford University"
              className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted mb-1 block">Start year</label>
              <input
                value={entry.startYear}
                onChange={e => update(i, 'startYear', e.target.value)}
                placeholder="2018"
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">End year</label>
              <div className="flex items-center gap-2">
                <input
                  value={entry.endYear}
                  onChange={e => update(i, 'endYear', e.target.value)}
                  disabled={entry.inProgress}
                  placeholder="2022"
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors disabled:opacity-40"
                />
                <label className="flex items-center gap-1 text-[10px] text-muted whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={entry.inProgress}
                    onChange={e => update(i, 'inProgress', e.target.checked)}
                    className="rounded border-border"
                  />
                  In progress
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted mb-1 block">Grade / GPA <span className="text-muted/50">(optional)</span></label>
            <input
              value={entry.gpa}
              onChange={e => update(i, 'gpa', e.target.value)}
              placeholder="3.8 / 4.0"
              className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
            />
          </div>
        </div>
      ))}

      <button
        onClick={add}
        className="w-full py-2 text-[12px] text-teal bg-white border border-teal/30 rounded-lg hover:bg-teal/5 transition-colors"
      >
        + Add another qualification
      </button>

      <button
        onClick={() => onSave(entries.filter(e => e.degree && e.field && e.institution))}
        disabled={!valid}
        className="w-full mt-2 py-2.5 text-[13px] font-medium text-white bg-teal hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        Done with education →
      </button>
    </div>
  )
}
