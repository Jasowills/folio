import type { TemplateConfig } from './types'
import type { TemplateStyle } from '../../../templates/types'

const ATS_STYLE: TemplateStyle = {
  header: 'center',
  heading: 'underline',
  bullet: 'dot',
  font: 'sans',
  spacing: 'normal',
}

const COMPACT_ATS_STYLE: TemplateStyle = {
  header: 'center',
  heading: 'small-caps',
  bullet: 'dot',
  font: 'serif',
  spacing: 'compact',
}

const MODERN_STYLE: TemplateStyle = {
  header: 'center',
  heading: 'left-bar',
  bullet: 'dot',
  font: 'sans',
  spacing: 'normal',
}

const EXECUTIVE_STYLE: TemplateStyle = {
  header: 'dark-block',
  heading: 'underline',
  bullet: 'dot',
  font: 'serif',
  spacing: 'normal',
}

const CREATIVE_STYLE: TemplateStyle = {
  header: 'top-stripe',
  heading: 'badge',
  bullet: 'arrow',
  font: 'display',
  spacing: 'airy',
}

const TECH_STYLE: TemplateStyle = {
  header: 'minimal',
  heading: 'underline',
  bullet: 'hyphen',
  font: 'mono',
  spacing: 'compact',
}

const ACADEMIC_STYLE: TemplateStyle = {
  header: 'center',
  heading: 'small-caps',
  bullet: 'dot',
  font: 'serif',
  spacing: 'compact',
}

export const TEMPLATE_CONFIGS: TemplateConfig[] = [
  // ATS Classic (8)
  { id: 'ledger', name: 'Ledger', category: 'ATS Classic', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'none', photoHandling: 'none', atsSafe: true, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'drop-to-single', style: { ...ATS_STYLE, font: 'serif' } },
  { id: 'meridian', name: 'Meridian', category: 'ATS Classic', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'small-caps-spaced', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: true, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: ATS_STYLE },
  { id: 'foundry', name: 'Foundry', category: 'ATS Classic', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'none', photoHandling: 'none', atsSafe: true, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: { ...ATS_STYLE, heading: 'uppercase' } },
  { id: 'almanac', name: 'Almanac', category: 'ATS Classic', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'none', photoHandling: 'none', atsSafe: true, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: ATS_STYLE },
  { id: 'bureau', name: 'Bureau', category: 'ATS Classic', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'small-caps-spaced', accentMechanic: 'none', photoHandling: 'none', atsSafe: true, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'drop-to-single', style: COMPACT_ATS_STYLE },
  { id: 'ironclad', name: 'Ironclad', category: 'ATS Classic', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'small-caps-spaced', accentMechanic: 'none', photoHandling: 'none', atsSafe: true, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'drop-to-single', style: { ...ATS_STYLE, font: 'serif', heading: 'small-caps' } },
  { id: 'northline', name: 'Northline', category: 'ATS Classic', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: true, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: { ...ATS_STYLE, spacing: 'airy' } },
  { id: 'plainscript', name: 'Plainscript', category: 'ATS Classic', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'numbered', accentMechanic: 'none', photoHandling: 'none', atsSafe: true, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: { ...ATS_STYLE, font: 'serif', heading: 'small-caps' } },

  // Modern Minimal (5)
  { id: 'halcyon', name: 'Halcyon', category: 'Modern Minimal', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: MODERN_STYLE },
  { id: 'driftwood', name: 'Driftwood', category: 'Modern Minimal', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: { ...MODERN_STYLE, spacing: 'airy' } },
  { id: 'paperwhite', name: 'Paperwhite', category: 'Modern Minimal', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'small-caps-spaced', accentMechanic: 'none', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: MODERN_STYLE },
  { id: 'fieldnote', name: 'Fieldnote', category: 'Modern Minimal', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'geometric-dividers', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: { ...MODERN_STYLE, font: 'mono' } },
  { id: 'vellum', name: 'Vellum', category: 'Modern Minimal', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'small-caps-spaced', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: { ...MODERN_STYLE, font: 'serif' } },

  // Two-Column (5)
  { id: 'meridian-split', name: 'Meridian Split', category: 'Two-Column', columnLayout: 'sidebar-left', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'colored-tab', accentMechanic: 'color-blocked-bg', photoHandling: 'circle', atsSafe: false, photoSupport: 'optional', densityScale: 'standard', sidebarContinuation: 'repeat', style: MODERN_STYLE },
  { id: 'compass', name: 'Compass', category: 'Two-Column', columnLayout: 'sidebar-left', headerTreatment: 'left-aligned', sectionHeaderStyle: 'icon-plus-label', accentMechanic: 'color-blocked-bg', photoHandling: 'circle', atsSafe: false, photoSupport: 'optional', densityScale: 'standard', sidebarContinuation: 'repeat', style: MODERN_STYLE },
  { id: 'skyline', name: 'Skyline', category: 'Two-Column', columnLayout: 'sidebar-left', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'timeline', photoHandling: 'circle', atsSafe: false, photoSupport: 'optional', densityScale: 'standard', sidebarContinuation: 'repeat', style: MODERN_STYLE },
  { id: 'atlas', name: 'Atlas', category: 'Two-Column', columnLayout: 'sidebar-left', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'colored-tab', accentMechanic: 'pill-tags', photoHandling: 'circle', atsSafe: false, photoSupport: 'optional', densityScale: 'standard', sidebarContinuation: 'repeat', style: MODERN_STYLE },
  { id: 'harbor', name: 'Harbor', category: 'Two-Column', columnLayout: 'header-band-plus-single', headerTreatment: 'full-bleed-band', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: MODERN_STYLE },

  // Executive (5)
  { id: 'boardroom', name: 'Boardroom', category: 'Executive', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: EXECUTIVE_STYLE },
  { id: 'summit', name: 'Summit', category: 'Executive', columnLayout: 'header-band-plus-single', headerTreatment: 'full-bleed-band', sectionHeaderStyle: 'small-caps-spaced', accentMechanic: 'color-blocked-bg', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: EXECUTIVE_STYLE },
  { id: 'chairman', name: 'Chairman', category: 'Executive', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: { ...EXECUTIVE_STYLE, heading: 'uppercase' } },
  { id: 'monarch', name: 'Monarch', category: 'Executive', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: EXECUTIVE_STYLE },
  { id: 'statesman', name: 'Statesman', category: 'Executive', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'colored-tab', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'drop-to-single', style: EXECUTIVE_STYLE },

  // Creative (5)
  { id: 'prism', name: 'Prism', category: 'Creative', columnLayout: 'header-band-plus-single', headerTreatment: 'full-bleed-band', sectionHeaderStyle: 'underline-rule', accentMechanic: 'geometric-dividers', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: CREATIVE_STYLE },
  { id: 'canvas-bold', name: 'Canvas Bold', category: 'Creative', columnLayout: 'asymmetric-grid', headerTreatment: 'split-header', sectionHeaderStyle: 'colored-tab', accentMechanic: 'color-blocked-bg', photoHandling: 'framed', atsSafe: false, photoSupport: 'optional', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: CREATIVE_STYLE },
  { id: 'studio', name: 'Studio', category: 'Creative', columnLayout: 'sidebar-left', headerTreatment: 'card-block', sectionHeaderStyle: 'icon-plus-label', accentMechanic: 'color-blocked-bg', photoHandling: 'circle', atsSafe: false, photoSupport: 'optional', densityScale: 'airy', sidebarContinuation: 'repeat', style: CREATIVE_STYLE },
  { id: 'palette', name: 'Palette', category: 'Creative', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'icon-plus-label', accentMechanic: 'pill-tags', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: CREATIVE_STYLE },
  { id: 'kinetic', name: 'Kinetic', category: 'Creative', columnLayout: 'asymmetric-grid', headerTreatment: 'left-aligned', sectionHeaderStyle: 'colored-tab', accentMechanic: 'geometric-dividers', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: CREATIVE_STYLE },

  // Tech (5)
  { id: 'terminal', name: 'Terminal', category: 'Tech', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'none', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'drop-to-single', style: TECH_STYLE },
  { id: 'commit', name: 'Commit', category: 'Tech', columnLayout: 'sidebar-left', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'pill-tags', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'repeat', style: TECH_STYLE },
  { id: 'syntax', name: 'Syntax', category: 'Tech', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'icon-plus-label', accentMechanic: 'pill-tags', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: TECH_STYLE },
  { id: 'kernel', name: 'Kernel', category: 'Tech', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'drop-to-single', style: TECH_STYLE },
  { id: 'stack', name: 'Stack', category: 'Tech', columnLayout: 'sidebar-right', headerTreatment: 'card-block', sectionHeaderStyle: 'colored-tab', accentMechanic: 'color-blocked-bg', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'repeat', style: TECH_STYLE },

  // Academic (5)
  { id: 'thesis', name: 'Thesis', category: 'Academic', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'numbered', accentMechanic: 'none', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'drop-to-single', style: ACADEMIC_STYLE },
  { id: 'faculty', name: 'Faculty', category: 'Academic', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'small-caps-spaced', accentMechanic: 'none', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'compact', sidebarContinuation: 'drop-to-single', style: ACADEMIC_STYLE },
  { id: 'curriculum', name: 'Curriculum', category: 'Academic', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'numbered', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: ACADEMIC_STYLE },
  { id: 'archive', name: 'Archive', category: 'Academic', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'small-caps-spaced', accentMechanic: 'single-line', photoHandling: 'none', atsSafe: false, photoSupport: 'none', densityScale: 'airy', sidebarContinuation: 'drop-to-single', style: { ...ACADEMIC_STYLE, spacing: 'airy' } },

  // Photo-Forward (3)
  { id: 'portrait', name: 'Portrait', category: 'Photo-Forward', columnLayout: 'single-column', headerTreatment: 'centered-stacked', sectionHeaderStyle: 'underline-rule', accentMechanic: 'single-line', photoHandling: 'circle', atsSafe: false, photoSupport: 'required', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: MODERN_STYLE },
  { id: 'frame', name: 'Frame', category: 'Photo-Forward', columnLayout: 'single-column', headerTreatment: 'left-aligned', sectionHeaderStyle: 'colored-tab', accentMechanic: 'single-line', photoHandling: 'square', atsSafe: false, photoSupport: 'required', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: MODERN_STYLE },
  { id: 'profile-card', name: 'Profile Card', category: 'Photo-Forward', columnLayout: 'single-column', headerTreatment: 'card-block', sectionHeaderStyle: 'icon-plus-label', accentMechanic: 'color-blocked-bg', photoHandling: 'circle', atsSafe: false, photoSupport: 'required', densityScale: 'standard', sidebarContinuation: 'drop-to-single', style: MODERN_STYLE },
]

export function getTemplateConfig(id: string): TemplateConfig | undefined {
  return TEMPLATE_CONFIGS.find(t => t.id === id)
}

export function getTemplateName(id: string): string {
  return getTemplateConfig(id)?.name || id
}

export function getTemplateCategory(id: string): string {
  return getTemplateConfig(id)?.category || ''
}
