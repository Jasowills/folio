import type { LocalData, DesignSettings } from '../../../pages/editor/types'
import type { TemplateStyle } from '../../../templates/types'

export interface ResumeRenderProps {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
}

export type ResumeLayout = React.ComponentType<ResumeRenderProps>

export const TEMPLATE_DEFS = [
  { id: 'minimal', name: 'Minimal', description: 'Clean single column, ATS-friendly', layout: 'single-column' as const },
  { id: 'modern', name: 'Modern', description: 'Two-column with accent sidebar', layout: 'two-column' as const },
  { id: 'executive', name: 'Executive', description: 'Dark header block, serif, for senior roles', layout: 'single-column' as const },
  { id: 'compact', name: 'Compact', description: 'Dense layout fitting more per page', layout: 'single-column' as const },
  { id: 'classic', name: 'Classic', description: 'Traditional serif format, universally accepted', layout: 'single-column' as const },
  { id: 'sidebar', name: 'Sidebar', description: 'Left sidebar for contact & skills', layout: 'sidebar' as const },
  { id: 'bold', name: 'Bold', description: 'Top accent stripe, badge headings', layout: 'single-column' as const },
  { id: 'creative', name: 'Creative', description: 'Colorful two-column for design roles', layout: 'two-column' as const },
  { id: 'tech', name: 'Tech', description: 'Clean two-column for engineering roles', layout: 'two-column' as const },
  { id: 'academic', name: 'Academic', description: 'Serif with left-bar headings, research emphasis', layout: 'single-column' as const },
  { id: 'charter', name: 'Charter', description: 'Dark header block, serif, small-caps headings', layout: 'single-column' as const },
  { id: 'prestige', name: 'Prestige', description: 'Centered-line header, check bullets, sidebar', layout: 'sidebar' as const },
  { id: 'engineer', name: 'Engineer', description: 'Monospace two-column with badge headings', layout: 'two-column' as const },
  { id: 'contemporary', name: 'Contemporary', description: 'Top-stripe header, left-bar sections, airy', layout: 'two-column' as const },
  { id: 'folio', name: 'Folio', description: 'Left-accent headings, display font, clean', layout: 'single-column' as const },
] as const

export type TemplateId = (typeof TEMPLATE_DEFS)[number]['id']
