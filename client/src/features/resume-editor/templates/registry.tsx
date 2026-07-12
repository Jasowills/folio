import type { ResumeLayout } from './types'
import { TEMPLATE_DEFS } from './types'
import type { TemplateStyle } from '../../../templates/types'
import SingleColumn from './layouts/SingleColumn'
import TwoColumn from './layouts/TwoColumn'
import Sidebar from './layouts/Sidebar'
import ConfigurableLayout from './config/ConfigurableLayout'
import { TEMPLATE_CONFIGS, getTemplateConfig } from './config/registry'
import type { LocalData, DesignSettings } from '../../../pages/editor/types'

const TEMPLATE_NAMES: Record<string, string> = {}
for (const t of TEMPLATE_DEFS) {
  TEMPLATE_NAMES[t.id] = t.name
}
for (const t of TEMPLATE_CONFIGS) {
  TEMPLATE_NAMES[t.id] = t.name
}

const STYLE_PRESETS: Record<string, TemplateStyle> = {
  minimal:  { header: 'center',       heading: 'underline',  bullet: 'dot',   font: 'sans',    spacing: 'normal' },
  modern:   { header: 'thin-line',    heading: 'uppercase',  bullet: 'dash',  font: 'sans',    spacing: 'normal' },
  executive:{ header: 'dark-block',   heading: 'underline',  bullet: 'dash',  font: 'serif',   spacing: 'normal' },
  compact:  { header: 'left-accent',  heading: 'uppercase',  bullet: 'dot',   font: 'sans',    spacing: 'compact' },
  classic:  { header: 'centered-line',heading: 'small-caps', bullet: 'dot',   font: 'serif',   spacing: 'airy' },
  sidebar:  { header: 'center',       heading: 'left-bar',   bullet: 'arrow', font: 'display', spacing: 'normal' },
  bold:     { header: 'top-stripe',   heading: 'badge',      bullet: 'check', font: 'sans',    spacing: 'compact' },
  creative: { header: 'thin-line',    heading: 'dot-accent', bullet: 'hyphen',font: 'display', spacing: 'normal' },
  tech:     { header: 'minimal',      heading: 'small-caps', bullet: 'dash',  font: 'mono',    spacing: 'compact' },
  academic: { header: 'center',       heading: 'left-bar',   bullet: 'dot',   font: 'serif',   spacing: 'airy' },
  charter:  { header: 'dark-block',   heading: 'small-caps', bullet: 'arrow', font: 'serif',   spacing: 'normal' },
  prestige: { header: 'centered-line',heading: 'dot-accent', bullet: 'check', font: 'sans',    spacing: 'airy' },
  engineer: { header: 'minimal',      heading: 'badge',      bullet: 'hyphen',font: 'mono',    spacing: 'compact' },
  contemporary: { header: 'top-stripe',heading: 'left-bar',  bullet: 'dash',  font: 'sans',    spacing: 'airy' },
  folio:    { header: 'left-accent',  heading: 'small-caps', bullet: 'hyphen',font: 'display', spacing: 'normal' },
}

const LEGACY_LAYOUT_MAP: Record<string, ResumeLayout> = {
  minimal: SingleColumn,
  modern: TwoColumn,
  executive: SingleColumn,
  compact: SingleColumn,
  classic: SingleColumn,
  sidebar: Sidebar,
  bold: SingleColumn,
  creative: TwoColumn,
  tech: TwoColumn,
  academic: SingleColumn,
  charter: SingleColumn,
  prestige: Sidebar,
  engineer: TwoColumn,
  contemporary: TwoColumn,
  folio: SingleColumn,
}

interface ConfigurableResumeProps {
  data: LocalData
  design: DesignSettings
  sectionSpacing?: number
}

function wrapConfigurable(configId: string) {
  return function ConfigurableWrapper({ data, design, sectionSpacing }: ConfigurableResumeProps) {
    const config = getTemplateConfig(configId)
    if (!config) return <SingleColumn data={data} design={design} style={STYLE_PRESETS.minimal} sectionSpacing={sectionSpacing} />
    return <ConfigurableLayout config={config} data={data} design={design} />
  }
}

const LAYOUT_MAP: Record<string, ResumeLayout> = {}
for (const id of Object.keys(LEGACY_LAYOUT_MAP)) {
  LAYOUT_MAP[id] = LEGACY_LAYOUT_MAP[id]
}
for (const config of TEMPLATE_CONFIGS) {
  LAYOUT_MAP[config.id] = wrapConfigurable(config.id) as unknown as ResumeLayout
}

export function getTemplateStyle(id: string): TemplateStyle {
  const config = getTemplateConfig(id)
  if (config) return config.style
  return STYLE_PRESETS[id] || STYLE_PRESETS.minimal
}

export function getTemplateLayout(id: string): ResumeLayout {
  return LAYOUT_MAP[id] || SingleColumn
}

export function getTemplateName(id: string): string {
  return TEMPLATE_NAMES[id] || id
}

export function getTemplateCategory(id: string): string {
  const config = getTemplateConfig(id)
  if (config) return config.category
  const legacy = TEMPLATE_DEFS.find(t => t.id === id)
  if (legacy) {
    if (['minimal', 'meridian', 'foundry', 'almanac', 'bureau', 'ironclad', 'northline', 'plainscript'].includes(id)) return 'ATS Classic'
    if (['halcyon', 'driftwood', 'paperwhite', 'fieldnote', 'vellum'].includes(id)) return 'Modern Minimal'
    if (['meridian-split', 'compass', 'skyline', 'atlas', 'harbor'].includes(id)) return 'Two-Column'
    if (['boardroom', 'summit', 'chairman', 'monarch', 'statesman'].includes(id)) return 'Executive'
    if (['prism', 'canvas-bold', 'studio', 'palette', 'kinetic'].includes(id)) return 'Creative'
    if (['terminal', 'commit', 'syntax', 'kernel', 'stack'].includes(id)) return 'Tech'
    if (['thesis', 'faculty', 'curriculum', 'archive'].includes(id)) return 'Academic'
    if (['portrait', 'frame', 'profile-card'].includes(id)) return 'Photo-Forward'
  }
  return ''
}

export function getAllTemplateIds(): string[] {
  return [...TEMPLATE_DEFS.map(t => t.id), ...TEMPLATE_CONFIGS.map(t => t.id)]
}

export function getTemplateIdsByCategory(category: string): string[] {
  return TEMPLATE_CONFIGS.filter(t => t.category === category).map(t => t.id)
}
