import { useState } from 'react'
import type { TemplateId } from '../../resume-editor/templates/types'
import { TEMPLATE_DEFS } from '../../resume-editor/templates/types'
import { TEMPLATE_PREVIEWS } from '../../../templates'

interface Props {
  selected: TemplateId | null
  onSelect: (id: TemplateId) => void
  creating: boolean
}

const FILTERS = ['All', 'Classic', 'Modern', 'Creative', 'Executive', 'ATS-safe', 'Tech', 'Academic'] as const

const TEMPLATE_META: Record<string, { badge: string; badgeColor: string }> = {
  minimal: { badge: 'ATS safe', badgeColor: 'text-green-700 bg-green-50 border-green-200' },
  modern: { badge: 'Modern', badgeColor: 'text-teal bg-teal/10 border-teal/20' },
  executive: { badge: 'Executive', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200' },
  compact: { badge: 'ATS safe', badgeColor: 'text-green-700 bg-green-50 border-green-200' },
  classic: { badge: 'ATS safe', badgeColor: 'text-green-700 bg-green-50 border-green-200' },
  sidebar: { badge: 'Creative', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200' },
  bold: { badge: 'Creative', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200' },
  creative: { badge: 'Creative', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200' },
  tech: { badge: 'Modern', badgeColor: 'text-teal bg-teal/10 border-teal/20' },
  academic: { badge: 'ATS safe', badgeColor: 'text-green-700 bg-green-50 border-green-200' },
  charter: { badge: 'Executive', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200' },
  prestige: { badge: 'Creative', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200' },
  engineer: { badge: 'Modern', badgeColor: 'text-teal bg-teal/10 border-teal/20' },
  contemporary: { badge: 'Modern', badgeColor: 'text-teal bg-teal/10 border-teal/20' },
  folio: { badge: 'Creative', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200' },
}

function templateMatchesFilter(t: typeof TEMPLATE_DEFS[number], filter: string): boolean {
  if (filter === 'All') return true
  const meta = TEMPLATE_META[t.id]
  if (!meta) return false
  return meta.badge.toLowerCase() === filter.toLowerCase()
}

export default function Step0TemplateSelection({ selected, onSelect, creating }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>('All')
  const filtered = TEMPLATE_DEFS.filter(t => templateMatchesFilter(t, activeFilter))
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-[1000px] w-full">
        <div className="text-center mb-10">
          <h1 className="font-display text-[32px] text-ink mb-2" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
            Start with a template.
          </h1>
          <p className="text-[15px] text-muted font-body max-w-[500px] mx-auto" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
            You can change this at any time. Pick one that fits the kind of role you are going for.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3.5 py-1.5 text-[12px] rounded-full border transition-colors ${
                activeFilter === f ? 'bg-teal text-white border-teal' : 'bg-white text-muted border-border hover:border-teal/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {filtered.map(t => {
            const meta = TEMPLATE_META[t.id] || { badge: 'Standard', badgeColor: 'text-muted bg-paper border-border' }
            const isSelected = selected === t.id

            return (
                <button
                  key={t.id}
                  onClick={() => onSelect(t.id as TemplateId)}
                  disabled={creating}
                  className="group relative bg-white rounded-xl border-2 transition-all text-left overflow-hidden"
                  style={{ borderColor: isSelected ? '#0F6E56' : 'transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                <div className="aspect-[210/280] bg-white flex items-center justify-center overflow-hidden p-1">
                  {TEMPLATE_PREVIEWS[t.id] && (
                    <div
                      className="w-full h-full [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                      dangerouslySetInnerHTML={{
                        __html: TEMPLATE_PREVIEWS[t.id].replace('currentColor', '#0F6E56'),
                      }}
                    />
                  )}
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink">{t.name}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${meta.badgeColor}`}>
                    {meta.badge}
                  </span>
                </div>
                <div className={`absolute inset-0 border-2 border-transparent group-hover:border-teal rounded-xl transition-colors pointer-events-none`} />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="block w-full text-center py-2 text-[12px] font-medium text-white bg-teal rounded-lg">
                    {creating ? 'Creating session...' : 'Use this template'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
