import type { CSSProperties, ReactNode } from 'react'
import type { TemplateStyle } from '../../../../templates/types'
import type { DesignSettings } from '../../../../pages/editor/types'

export function bulletChar(style: TemplateStyle): string {
  switch (style.bullet) {
    case 'dash': return '\u2014'
    case 'arrow': return '\u25B8'
    case 'hyphen': return '\u2023'
    case 'check': return '\u2713'
    default: return '\u2022'
  }
}

export function headingClasses(style: TemplateStyle): string {
  const base = 'text-[13px] font-semibold uppercase tracking-wider mb-2'
  switch (style.heading) {
    case 'underline': return `${base} border-b border-border pb-1`
    case 'left-bar': return `${base} pl-2.5`
    case 'small-caps': return 'text-[13px] font-semibold tracking-wider mb-2'
    case 'badge': return 'text-[11px] font-bold uppercase tracking-wider mb-2'
    default: return base
  }
}

export function headingStyle(style: TemplateStyle, accentColor: string): CSSProperties {
  switch (style.heading) {
    case 'left-bar': return { borderLeft: `3px solid ${accentColor}`, paddingLeft: '10px' }
    case 'badge': return { backgroundColor: accentColor, color: '#fff', display: 'inline-block' as const, padding: '2px 10px', borderRadius: '3px' }
    case 'dot-accent': return { borderBottom: `2px dotted ${accentColor}`, paddingBottom: '2px', display: 'inline-block' as const }
    default: return { color: accentColor }
  }
}

export function bodyFontFamily(design: DesignSettings): string {
  return `"${design.bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
}

export function headingFontFamily(design: DesignSettings): string {
  return `"${design.headingFont}", Georgia, "Times New Roman", serif`
}

const RED_FLAGS: Array<{ message: string; severity: string; section?: string }> = []

export function hasFlag(section: string): boolean {
  return RED_FLAGS.some(rf => rf.section?.toLowerCase() === section)
}

export function formatDate(start?: string, end?: string, current?: boolean): string {
  const parts = [start, current ? 'Present' : end].filter(Boolean)
  return parts.join(' \u2014 ')
}
