import { useState } from 'react'
import type { TemplateId } from '../../resume-editor/templates/types'
import { TEMPLATE_DEFS } from '../../resume-editor/templates/types'
import { TEMPLATE_PREVIEWS } from '../../../templates'
import { TEMPLATE_CONFIGS } from '../../resume-editor/templates/config/registry'

interface Props {
  selected: TemplateId | null
  onSelect: (id: TemplateId) => void
  creating: boolean
}

type Category = 'All' | 'ATS Classic' | 'Modern Minimal' | 'Two-Column' | 'Executive' | 'Creative' | 'Tech' | 'Academic' | 'Photo-Forward'

const CATEGORIES: Category[] = ['All', 'ATS Classic', 'Modern Minimal', 'Two-Column', 'Executive', 'Creative', 'Tech', 'Academic', 'Photo-Forward']

interface TemplateMeta {
  badge: string
  badgeColor: string
}

const CATEGORY_BADGES: Record<string, TemplateMeta> = {
  'ATS Classic': { badge: 'ATS Safe', badgeColor: 'text-green-700 bg-green-50 border-green-200' },
  'Modern Minimal': { badge: 'Modern', badgeColor: 'text-teal bg-teal/10 border-teal/20' },
  'Two-Column': { badge: 'Two-Column', badgeColor: 'text-blue-700 bg-blue-50 border-blue-200' },
  'Executive': { badge: 'Executive', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200' },
  'Creative': { badge: 'Creative', badgeColor: 'text-purple-700 bg-purple-50 border-purple-200' },
  'Tech': { badge: 'Tech', badgeColor: 'text-slate-700 bg-slate-50 border-slate-200' },
  'Academic': { badge: 'Academic', badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'Photo-Forward': { badge: 'Photo', badgeColor: 'text-rose-700 bg-rose-50 border-rose-200' },
}

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  minimal: 'ATS Classic', modern: 'Modern Minimal', executive: 'Executive',
  compact: 'ATS Classic', classic: 'ATS Classic', sidebar: 'Two-Column',
  bold: 'Creative', creative: 'Creative', tech: 'Tech', academic: 'Academic',
  charter: 'Executive', prestige: 'Two-Column', engineer: 'Tech',
  contemporary: 'Two-Column', folio: 'Creative',
}

function getBadge(_templateId: string, category: string): TemplateMeta {
  return CATEGORY_BADGES[category] || { badge: 'Standard', badgeColor: 'text-muted bg-paper border-border' }
}

interface FlatTemplate {
  id: string
  name: string
  description: string
  category: string
  hasSvg: boolean
}

const ALL_TEMPLATES: FlatTemplate[] = [
  ...TEMPLATE_DEFS.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: LEGACY_CATEGORY_MAP[t.id] || 'ATS Classic',
    hasSvg: !!TEMPLATE_PREVIEWS[t.id],
  })),
  ...TEMPLATE_CONFIGS.map(t => ({
    id: t.id,
    name: t.name,
    description: t.columnLayout === 'single-column' ? 'Clean single-column layout'
      : t.columnLayout.includes('sidebar') ? 'Sidebar layout'
      : t.columnLayout === 'header-band-plus-single' ? 'Header band layout'
      : t.columnLayout === 'asymmetric-grid' ? 'Asymmetric grid layout'
      : 'Custom layout',
    category: t.category,
    hasSvg: false,
  })),
]

function PlaceholderPreview({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    'from-teal/10 to-teal/5', 'from-amber/10 to-amber/5', 'from-blue/10 to-blue/5',
    'from-purple/10 to-purple/5', 'from-rose/10 to-rose/5', 'from-slate/10 to-slate/5',
    'from-indigo/10 to-indigo/5', 'from-emerald/10 to-emerald/5',
  ]
  const colorIdx = name.charCodeAt(0) % colors.length
  return (
    <div className={`w-full h-full bg-gradient-to-br ${colors[colorIdx]} flex flex-col items-center justify-center rounded-sm`}>
      <span className="text-[28px] font-bold text-ink/15 font-display" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>{initials}</span>
      <div className="mt-3 w-[60%] space-y-1.5">
        <div className="h-1 bg-ink/8 rounded w-full" />
        <div className="h-1 bg-ink/8 rounded w-4/5" />
        <div className="h-1 bg-ink/8 rounded w-3/5" />
        <div className="mt-2 h-0.5 bg-ink/5 rounded w-full" />
        <div className="h-1 bg-ink/6 rounded w-full" />
        <div className="h-1 bg-ink/6 rounded w-5/6" />
        <div className="h-1 bg-ink/6 rounded w-4/5" />
      </div>
    </div>
  )
}

export default function Step0TemplateSelection({ selected, onSelect, creating }: Props) {
  const [activeFilter, setActiveFilter] = useState<Category>('All')
  const filtered = activeFilter === 'All'
    ? ALL_TEMPLATES
    : ALL_TEMPLATES.filter(t => t.category === activeFilter)

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-[1100px] w-full">
        <div className="text-center mb-10">
          <h1 className="font-display text-[32px] text-ink mb-2" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
            Start with a template.
          </h1>
          <p className="text-[15px] text-muted font-body max-w-[500px] mx-auto" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
            You can change this at any time. Pick one that fits the kind of role you are going for.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3.5 py-1.5 text-[12px] rounded-full border transition-colors ${
                activeFilter === cat ? 'bg-teal text-white border-teal' : 'bg-white text-muted border-border hover:border-teal/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted/50 text-center mb-4">{filtered.length} templates</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(t => {
            const badge = getBadge(t.id, t.category)
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
                  {t.hasSvg && TEMPLATE_PREVIEWS[t.id] ? (
                    <div
                      className="w-full h-full [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                      dangerouslySetInnerHTML={{
                        __html: TEMPLATE_PREVIEWS[t.id].replace('currentColor', '#0F6E56'),
                      }}
                    />
                  ) : (
                    <PlaceholderPreview name={t.name} />
                  )}
                </div>
                <div className="px-3 py-2.5 flex items-center justify-between gap-1">
                  <span className="text-[12px] font-semibold text-ink truncate">{t.name}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${badge.badgeColor}`}>
                    {badge.badge}
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
