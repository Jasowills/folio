import type { ResumeLayout, TemplateId } from './types'
import type { TemplateStyle } from '../../../templates/types'
import SingleColumn from './layouts/SingleColumn'
import TwoColumn from './layouts/TwoColumn'
import Sidebar from './layouts/Sidebar'

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

const LAYOUT_MAP: Record<TemplateId, ResumeLayout> = {
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

export function getTemplateStyle(id: TemplateId): TemplateStyle {
  return STYLE_PRESETS[id] || STYLE_PRESETS.minimal
}

export function getTemplateLayout(id: TemplateId): ResumeLayout {
  return LAYOUT_MAP[id] || SingleColumn
}
