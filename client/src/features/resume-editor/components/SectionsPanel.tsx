import type { LocalData } from '../../../pages/editor/types'
import { ALL_SECTION_NAMES } from '../../../pages/editor/types'
import { IconPlus, IconTrash, IconGripVertical } from '@tabler/icons-react'
import { useState } from 'react'

interface Props {
  data: LocalData
  onUpdate: (data: LocalData) => void
}

export default function SectionsPanel({ data, onUpdate }: Props) {
  const [customTitle, setCustomTitle] = useState('')

  const sectionLabels: Record<string, string> = Object.fromEntries(
    ALL_SECTION_NAMES.map(s => [s.key, s.label])
  )

  const presentSections = data.sectionOrder.filter(s => {
    if (s === 'summary') return !!data.summary
    if (s === 'experience') return data.experience.length > 0
    if (s === 'education') return data.education.length > 0
    if (s === 'skills') return data.skills.length > 0
    if (s === 'certifications') return data.certifications.length > 0
    if (s === 'languages') return data.languages.length > 0
    if (s === 'links') return data.links.length > 0
    return true
  })

  const availableSections = ALL_SECTION_NAMES.filter(
    s => !data.sectionOrder.includes(s.key) && !presentSections.includes(s.key)
  )

  function moveSection(index: number, direction: -1 | 1) {
    const order = [...data.sectionOrder]
    const target = index + direction
    if (target < 0 || target >= order.length) return
    ;[order[index], order[target]] = [order[target], order[index]]
    onUpdate({ ...data, sectionOrder: order })
  }

  function removeSection(key: string) {
    const order = data.sectionOrder.filter(s => s !== key)
    onUpdate({ ...data, sectionOrder: order })
  }

  function addSection(key: string) {
    const order = [...data.sectionOrder, key]
    onUpdate({ ...data, sectionOrder: order })
  }

  function addCustomSection() {
    if (!customTitle.trim()) return
    const id = `custom-${Date.now()}`
    onUpdate({
      ...data,
      sectionOrder: [...data.sectionOrder, id],
      customSections: [...(data.customSections || []), { id, title: customTitle.trim(), content: [''], type: 'bullets' as const }],
    })
    setCustomTitle('')
  }

  return (
    <div className="p-3 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted px-1">Current Sections</p>

      {presentSections.length === 0 && (
        <p className="text-[11px] text-muted/60 italic px-1">No sections yet. Add one below.</p>
      )}

      <div className="space-y-0.5">
        {presentSections.map((key, i) => {
          const isCustom = key.startsWith('custom-')
          const label = isCustom
            ? data.customSections?.find(c => c.id === key)?.title || 'Custom'
            : sectionLabels[key] || key
          return (
            <div
              key={key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-paper border border-border group"
            >
              <IconGripVertical className="h-3.5 w-3.5 text-muted/30 shrink-0 cursor-grab" />
              <span className="flex-1 text-[12px] text-ink truncate">{label}</span>
              <button
                onClick={() => moveSection(i, -1)}
                disabled={i === 0}
                className="p-0.5 text-muted/30 hover:text-muted disabled:opacity-20 cursor-pointer"
                title="Move up"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
              </button>
              <button
                onClick={() => moveSection(i, 1)}
                disabled={i === presentSections.length - 1}
                className="p-0.5 text-muted/30 hover:text-muted disabled:opacity-20 cursor-pointer"
                title="Move down"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <button
                onClick={() => removeSection(key)}
                className="p-0.5 text-muted/30 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Remove"
              >
                <IconTrash className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>

      {availableSections.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted px-1 pt-2">Add Section</p>
          <div className="space-y-0.5">
            {availableSections.map(s => (
              <button
                key={s.key}
                onClick={() => addSection(s.key)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
              >
                <IconPlus className="h-3 w-3" />
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted px-1 mb-1.5">Custom Section</p>
        <div className="flex gap-1 px-1">
          <input
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustomSection() }}
            placeholder="Section name..."
            className="flex-1 bg-paper border border-border rounded px-2 py-1 text-[11px] text-ink placeholder:text-muted/40 focus:outline-none focus:border-teal"
          />
          <button
            onClick={addCustomSection}
            disabled={!customTitle.trim()}
            className="px-2 py-1 rounded bg-teal text-white text-[10px] font-medium hover:bg-teal-dark transition-colors disabled:opacity-40 cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
