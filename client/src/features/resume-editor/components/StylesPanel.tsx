import { useState } from 'react'
import { TEMPLATES, TEMPLATE_PREVIEWS } from '../../../templates'
import type { DesignSettings } from '../../../pages/editor/types'
import { cn } from '../../../lib/utils'
import { IconTypography, IconPalette, IconLayout, IconTemplate } from '@tabler/icons-react'
import type { TemplateId } from '../templates'
import { TEMPLATE_CONFIGS } from '../templates/config/registry'
import { getTemplateName, getTemplateCategory } from '../templates/registry'

const HEADING_FONTS = ['DM Serif Display', 'Georgia', 'Garamond', 'Merriweather', 'EB Garamond', 'Lora', 'Libre Baskerville']
const BODY_FONTS = ['Plus Jakarta Sans', 'Calibri', 'Helvetica Neue', 'Source Sans Pro', 'Open Sans', 'Roboto', 'Lato', 'Nunito']

const PRESET_COLORS = [
  { name: 'Teal', value: '#0F6E56' },
  { name: 'Navy', value: '#1E3A5F' },
  { name: 'Forest', value: '#2D5A27' },
  { name: 'Burgundy', value: '#722F37' },
  { name: 'Slate', value: '#475569' },
  { name: 'Amber', value: '#92400E' },
  { name: 'Cobalt', value: '#1E40AF' },
  { name: 'Plum', value: '#5B21B6' },
]

const LEGACY_IDS = ['minimal', 'modern', 'executive', 'compact', 'classic', 'sidebar', 'bold', 'creative', 'tech', 'academic', 'charter', 'prestige', 'engineer', 'contemporary', 'folio']

interface Props {
  templateId: TemplateId
  design: DesignSettings
  onTemplateChange: (id: TemplateId) => void
  onDesignChange: (design: DesignSettings) => void
}

export default function StylesPanel({ templateId, design, onTemplateChange, onDesignChange }: Props) {
  const [tab, setTab] = useState<'templates' | 'colors' | 'fonts' | 'layout'>('templates')
  const [category, setCategory] = useState<string>('all')

  const tabs = [
    { id: 'templates' as const, icon: IconTemplate, label: 'Templates' },
    { id: 'colors' as const, icon: IconPalette, label: 'Colors' },
    { id: 'fonts' as const, icon: IconTypography, label: 'Fonts' },
    { id: 'layout' as const, icon: IconLayout, label: 'Layout' },
  ]

  const categories = ['all', 'ATS Classic', 'Modern Minimal', 'Two-Column', 'Executive', 'Creative', 'Tech', 'Academic', 'Photo-Forward']

  const filteredTemplates = category === 'all'
    ? TEMPLATE_CONFIGS
    : TEMPLATE_CONFIGS.filter(t => t.category === category)

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border px-2 shrink-0">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-2 text-[10px] font-medium border-b-2 transition-colors cursor-pointer',
                tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'templates' && (
          <div className="p-3">
            <div className="flex flex-wrap gap-1 mb-3">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'px-2 py-1 text-[9px] font-medium rounded transition-colors cursor-pointer',
                    category === c ? 'bg-teal text-white' : 'bg-paper text-muted hover:text-ink',
                  )}
                >
                  {c === 'all' ? 'All' : c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates.map(tpl => {
                const isActive = templateId === tpl.id
                const svg = TEMPLATE_PREVIEWS[tpl.id] || TEMPLATE_PREVIEWS.minimal
                return (
                  <button
                    key={tpl.id}
                    onClick={() => onTemplateChange(tpl.id as TemplateId)}
                    className={cn(
                      'rounded-lg border-2 overflow-hidden transition-all hover:shadow-sm text-left cursor-pointer',
                      isActive ? 'border-teal' : 'border-border hover:border-muted',
                    )}
                  >
                    <div className="h-[90px] p-1.5 bg-white flex items-center justify-center">
                      {svg && (
                        <div
                          className="w-full h-full"
                          dangerouslySetInnerHTML={{
                            __html: svg.replace('currentColor', design.primaryColor),
                          }}
                        />
                      )}
                    </div>
                    <div className="px-2 py-1 border-t border-border">
                      <p className="text-[9px] font-semibold text-ink">{tpl.name}</p>
                      <p className="text-[8px] text-muted">{tpl.category}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'colors' && (
          <div className="p-4 space-y-5">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-2">Primary</label>
              <div className="grid grid-cols-8 gap-1.5 mb-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => onDesignChange({ ...design, primaryColor: c.value })}
                    className={cn(
                      'h-6 w-full rounded border-2 transition-all hover:scale-110 cursor-pointer',
                      design.primaryColor === c.value ? 'border-ink scale-110' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="relative cursor-pointer shrink-0">
                  <div className="h-6 w-6 rounded border-2 border-dashed border-border hover:border-muted flex items-center justify-center">
                    <span className="text-[9px] text-muted">+</span>
                  </div>
                  <input
                    type="color"
                    value={design.primaryColor}
                    onChange={e => onDesignChange({ ...design, primaryColor: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <input
                  value={design.primaryColor}
                  onChange={e => onDesignChange({ ...design, primaryColor: e.target.value })}
                  className="flex-1 bg-paper border border-border rounded px-2 py-1 text-[11px] text-ink font-mono focus:outline-none focus:border-teal"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'fonts' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1.5">Heading</label>
              <select
                value={design.headingFont}
                onChange={e => onDesignChange({ ...design, headingFont: e.target.value })}
                className="w-full bg-paper border border-border rounded px-2.5 py-1.5 text-[12px] text-ink focus:outline-none focus:border-teal"
                style={{ fontFamily: design.headingFont }}
              >
                {HEADING_FONTS.map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1.5">Body</label>
              <select
                value={design.bodyFont}
                onChange={e => onDesignChange({ ...design, bodyFont: e.target.value })}
                className="w-full bg-paper border border-border rounded px-2.5 py-1.5 text-[12px] text-ink focus:outline-none focus:border-teal"
                style={{ fontFamily: design.bodyFont }}
              >
                {BODY_FONTS.map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
                Size: <span className="text-ink">{design.bodyFontSize}px</span>
              </label>
              <input
                type="range"
                min={9} max={12} step={0.5}
                value={design.bodyFontSize}
                onChange={e => onDesignChange({ ...design, bodyFontSize: parseFloat(e.target.value) })}
                className="w-full accent-teal"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
                Line spacing: <span className="text-ink">{design.lineSpacing.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={1.2} max={1.8} step={0.1}
                value={design.lineSpacing}
                onChange={e => onDesignChange({ ...design, lineSpacing: parseFloat(e.target.value) })}
                className="w-full accent-teal"
              />
            </div>
          </div>
        )}

        {tab === 'layout' && (
          <div className="p-4 space-y-5">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-2">Columns</label>
              <div className="flex gap-2">
                {(['single-column', 'two-column'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => onDesignChange({ ...design, columnLayout: opt })}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg border text-[11px] font-medium transition-all cursor-pointer',
                      design.columnLayout === opt
                        ? 'border-teal bg-teal-light/20 text-teal'
                        : 'border-border text-muted hover:text-ink',
                    )}
                  >
                    {opt === 'single-column' ? 'Single' : 'Two'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
                Margins: <span className="text-ink">{(design.margins + 1) * 3}mm</span>
              </label>
              <input
                type="range" min={0} max={4} step={1}
                value={design.margins}
                onChange={e => onDesignChange({ ...design, margins: parseInt(e.target.value) })}
                className="w-full accent-teal"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
                Section gap
              </label>
              <input
                type="range" min={0} max={4} step={1}
                value={design.sectionSpacing}
                onChange={e => onDesignChange({ ...design, sectionSpacing: parseInt(e.target.value) })}
                className="w-full accent-teal"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
