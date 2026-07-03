import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TEMPLATES, TEMPLATE_PREVIEWS } from '../../templates'
import type { ResumeTemplate } from '../../templates/types'
import { cn } from '../../lib/utils'
import type { DesignSettings } from './types'
import { IconX, IconPalette, IconTypography, IconLayout, IconTemplate } from '@tabler/icons-react'

const HEADING_FONTS = ['Playfair Display', 'Georgia', 'Garamond', 'Merriweather', 'EB Garamond', 'Lora', 'Libre Baskerville']
const BODY_FONTS = ['Inter', 'Calibri', 'Helvetica Neue', 'Source Sans Pro', 'Open Sans', 'Roboto', 'Lato', 'Nunito']

const PRESET_COLORS = [
  { name: 'Ink Black', value: '#1A1A2E' },
  { name: 'Teal', value: '#0F6E56' },
  { name: 'Navy', value: '#1E3A5F' },
  { name: 'Forest', value: '#2D5A27' },
  { name: 'Burgundy', value: '#722F37' },
  { name: 'Slate', value: '#475569' },
  { name: 'Charcoal', value: '#374151' },
  { name: 'Amber', value: '#92400E' },
  { name: 'Cobalt', value: '#1E40AF' },
  { name: 'Plum', value: '#5B21B6' },
  { name: 'Terracotta', value: '#9A3412' },
  { name: 'Olive', value: '#4D7C0F' },
]

interface FilterChip {
  id: string
  label: string
}

const FILTERS: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'creative', label: 'Creative' },
  { id: 'executive', label: 'Executive' },
  { id: 'ats-safe', label: 'ATS-safe' },
]

const LAYOUT_OPTIONS = [
  { id: 'single-column', label: 'Single column' },
  { id: 'two-column', label: 'Two column' },
]

const MARGIN_STEPS = ['Tight', 'Moderate', 'Normal', 'Relaxed', 'Spacious']
const SPACING_STEPS = ['Compact', 'Slightly tight', 'Normal', 'Slightly airy', 'Airy']

interface Props {
  open: boolean
  onClose: () => void
  selectedTemplate: ResumeTemplate
  design: DesignSettings
  onDesignChange: (design: DesignSettings) => void
  onTemplateChange: (template: ResumeTemplate) => void
}

export default function DesignPanel({ open, onClose, selectedTemplate, design, onDesignChange, onTemplateChange }: Props) {
  const [activeTab, setActiveTab] = useState<'templates' | 'fonts' | 'colors' | 'layout'>('templates')
  const [templateFilter, setTemplateFilter] = useState('all')

  const filteredTemplates = TEMPLATES.filter(t => {
    if (templateFilter === 'all') return true
    if (templateFilter === 'ats-safe') return ['minimal', 'classic', 'compact', 'bold', 'tech'].includes(t.id)
    if (templateFilter === 'classic') return ['minimal', 'classic', 'executive', 'formal'].includes(t.id)
    if (templateFilter === 'modern') return ['modern', 'clean', 'sharp', 'slate'].includes(t.id)
    if (templateFilter === 'creative') return ['editorial', 'creative', 'accent', 'timeline'].includes(t.id)
    if (templateFilter === 'executive') return ['executive', 'bold', 'formal', 'board'].includes(t.id)
    return true
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-y-0 right-0 w-[380px] bg-surface border-l border-border shadow-xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h2 className="text-[15px] font-display font-semibold text-ink">Design</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer">
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className="flex border-b border-border px-3 shrink-0">
            {([
              { id: 'templates', icon: IconTemplate, label: 'Templates' },
              { id: 'fonts', icon: IconTypography, label: 'Fonts' },
              { id: 'colors', icon: IconPalette, label: 'Colors' },
              { id: 'layout', icon: IconLayout, label: 'Layout' },
            ] as const).map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors cursor-pointer',
                    activeTab === tab.id ? 'border-teal text-teal' : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'templates' && (
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {FILTERS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setTemplateFilter(f.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors cursor-pointer',
                        templateFilter === f.id ? 'bg-ink text-white' : 'bg-paper text-muted hover:text-ink',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filteredTemplates.map(tpl => {
                    const isActive = selectedTemplate.id === tpl.id
                    const isAtsSafe = ['minimal', 'classic', 'compact', 'executive', 'bold', 'sidebar', 'tech'].includes(tpl.id)
                    const isCreative = ['creative', 'editorial', 'accent'].includes(tpl.id)
                    const svg = TEMPLATE_PREVIEWS[tpl.id]
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => onTemplateChange(tpl)}
                        className={cn(
                          'rounded-lg border-2 overflow-hidden transition-all hover:shadow-sm text-left cursor-pointer',
                          isActive ? 'border-teal' : 'border-border hover:border-muted',
                        )}
                      >
                        <div className="h-[130px] p-2 bg-white flex items-center justify-center">
                          {svg && (
                            <div
                              className="w-full h-full"
                              dangerouslySetInnerHTML={{
                                __html: svg.replace('currentColor', design.primaryColor),
                              }}
                            />
                          )}
                        </div>
                        <div className="px-2.5 py-1.5 border-t border-border">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-ink">{tpl.name}</p>
                            <div className="flex gap-1">
                              {isAtsSafe && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-teal/10 text-teal font-medium">ATS</span>
                              )}
                              {isCreative && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-amber/10 text-amber font-medium">Creative</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'fonts' && (
              <div className="p-5 space-y-6">
                <div>
                  <label className="label-uppercase text-muted block mb-2">Heading Font</label>
                  <select
                    value={design.headingFont}
                    onChange={e => onDesignChange({ ...design, headingFont: e.target.value })}
                    className="w-full bg-paper border border-border rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-teal"
                    style={{ fontFamily: design.headingFont }}
                  >
                    {HEADING_FONTS.map(f => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-uppercase text-muted block mb-2">Body Font</label>
                  <select
                    value={design.bodyFont}
                    onChange={e => onDesignChange({ ...design, bodyFont: e.target.value })}
                    className="w-full bg-paper border border-border rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-teal"
                    style={{ fontFamily: design.bodyFont }}
                  >
                    {BODY_FONTS.map(f => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-uppercase text-muted block mb-2">
                    Body Font Size: <span className="text-ink font-semibold">{design.bodyFontSize}px</span>
                  </label>
                  <input
                    type="range"
                    min={9}
                    max={12}
                    step={0.5}
                    value={design.bodyFontSize}
                    onChange={e => onDesignChange({ ...design, bodyFontSize: parseFloat(e.target.value) })}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-[10px] text-muted mt-1">
                    <span>9px</span>
                    <span>12px</span>
                  </div>
                </div>
                <div>
                  <label className="label-uppercase text-muted block mb-2">
                    Line Spacing: <span className="text-ink font-semibold">{design.lineSpacing.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min={1.2}
                    max={1.8}
                    step={0.1}
                    value={design.lineSpacing}
                    onChange={e => onDesignChange({ ...design, lineSpacing: parseFloat(e.target.value) })}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-[10px] text-muted mt-1">
                    <span>Tight</span>
                    <span>Relaxed</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colors' && (
              <div className="p-5 space-y-6">
                <div>
                  <label className="label-uppercase text-muted block mb-2">Primary Color</label>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => onDesignChange({ ...design, primaryColor: c.value })}
                        className={cn(
                          'h-7 w-full rounded-lg border-2 transition-all hover:scale-110 cursor-pointer',
                          design.primaryColor === c.value ? 'border-ink scale-110' : 'border-transparent',
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative cursor-pointer">
                      <div className="h-7 w-7 rounded-lg border-2 border-dashed border-border hover:border-muted flex items-center justify-center">
                        <span className="text-[10px] text-muted">+</span>
                      </div>
                      <input
                        type="color"
                        value={design.primaryColor}
                        onChange={e => onDesignChange({ ...design, primaryColor: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                    <input
                      type="text"
                      value={design.primaryColor}
                      onChange={e => onDesignChange({ ...design, primaryColor: e.target.value })}
                      className="flex-1 bg-paper border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-ink font-mono focus:outline-none focus:border-teal"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-uppercase text-muted block mb-2">Secondary Color</label>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => onDesignChange({ ...design, secondaryColor: c.value })}
                        className={cn(
                          'h-7 w-full rounded-lg border-2 transition-all hover:scale-110 cursor-pointer',
                          design.secondaryColor === c.value ? 'border-ink scale-110' : 'border-transparent',
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={design.secondaryColor}
                    onChange={e => onDesignChange({ ...design, secondaryColor: e.target.value })}
                    className="w-full bg-paper border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-ink font-mono focus:outline-none focus:border-teal"
                    placeholder="#475569"
                  />
                </div>
              </div>
            )}

            {activeTab === 'layout' && (
              <div className="p-5 space-y-6">
                <div>
                  <label className="label-uppercase text-muted block mb-2">Column Layout</label>
                  <div className="flex gap-2">
                    {LAYOUT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => onDesignChange({ ...design, columnLayout: opt.id as 'single-column' | 'two-column' })}
                        className={cn(
                          'flex-1 px-3 py-2.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer',
                          design.columnLayout === opt.id
                            ? 'border-teal bg-teal-light/20 text-teal'
                            : 'border-border text-muted hover:text-ink hover:border-muted',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-uppercase text-muted block mb-2">
                    Margins: <span className="text-ink font-semibold">{MARGIN_STEPS[design.margins]}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={design.margins}
                    onChange={e => onDesignChange({ ...design, margins: parseInt(e.target.value) })}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-[10px] text-muted mt-1">
                    <span>Tight</span>
                    <span>Spacious</span>
                  </div>
                </div>
                <div>
                  <label className="label-uppercase text-muted block mb-2">
                    Section Spacing: <span className="text-ink font-semibold">{SPACING_STEPS[design.sectionSpacing]}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={design.sectionSpacing}
                    onChange={e => onDesignChange({ ...design, sectionSpacing: parseInt(e.target.value) })}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-[10px] text-muted mt-1">
                    <span>Compact</span>
                    <span>Airy</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
