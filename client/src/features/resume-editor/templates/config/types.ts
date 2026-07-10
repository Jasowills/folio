import type { TemplateStyle } from '../../../templates/types'

export type ColumnLayout = 'single-column' | 'sidebar-left' | 'sidebar-right' | 'header-band-plus-single' | 'asymmetric-grid'
export type HeaderTreatment = 'centered-stacked' | 'left-aligned' | 'full-bleed-band' | 'card-block' | 'split-header'
export type SectionHeaderStyle = 'underline-rule' | 'colored-tab' | 'icon-plus-label' | 'small-caps-spaced' | 'numbered' | 'none'
export type AccentMechanic = 'single-line' | 'color-blocked-bg' | 'geometric-dividers' | 'timeline' | 'pill-tags' | 'none'
export type PhotoHandling = 'none' | 'circle' | 'square' | 'framed' | 'integrated-into-header'

export interface TemplateConfig {
  id: string
  name: string
  category: string
  columnLayout: ColumnLayout
  headerTreatment: HeaderTreatment
  sectionHeaderStyle: SectionHeaderStyle
  accentMechanic: AccentMechanic
  photoHandling: PhotoHandling
  atsSafe: boolean
  photoSupport: 'required' | 'optional' | 'none'
  densityScale: 'compact' | 'standard' | 'airy'
  sidebarContinuation: 'repeat' | 'drop-to-single'
  style: TemplateStyle
}
