import type { ReactNode } from 'react'
import type { TemplateStyle, FontStyle } from '../../templates/types'

export function fontClass(font: FontStyle): string {
  switch (font) {
    case 'serif': return 'font-serif'
    case 'display': return 'font-display'
    case 'mono': return 'font-mono'
    default: return 'font-sans'
  }
}

export function spacingClass(spacing: TemplateStyle['spacing']): string {
  switch (spacing) {
    case 'compact': return 'space-y-2 text-[10px]'
    case 'airy': return 'space-y-5 text-[12px] leading-relaxed'
    default: return 'space-y-3 text-[11px]'
  }
}

export function renderHeader(
  style: TemplateStyle,
  name: string,
  contactLines: ReactNode,
  accentColor: string,
  pageIndex?: number,
) {
  if (pageIndex !== undefined && pageIndex > 0) return null

  const showHeader = pageIndex === undefined || pageIndex === 0
  if (!showHeader) return null

  switch (style.header) {
    case 'dark-block':
      return (
        <div data-header="true" className="bg-ink text-white text-center py-6 px-8 -mx-10 -mt-10 mb-6">
          <h1 className="font-bold tracking-wide mb-1 text-[24px] font-serif">
            {name}
          </h1>
          <div className="text-[10px] text-white/70">{contactLines}</div>
        </div>
      )

    case 'thin-line':
      return (
        <div data-header="true" className="text-center mb-6 border-b border-border pb-3">
          <h1 className="font-bold text-[22px] mb-1">{name}</h1>
          <div className="text-[10px] text-muted">{contactLines}</div>
        </div>
      )

    case 'left-accent':
      return (
        <div data-header="true" className="text-left mb-6" style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: '12px' }}>
          <h1 className="font-bold text-[22px] mb-1">{name}</h1>
          <div className="text-[10px] text-muted">{contactLines}</div>
        </div>
      )

    case 'top-stripe':
      return (
        <div data-header="true" className="text-center mb-6 pt-8 relative">
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: accentColor }} />
          <h1 className="font-bold text-[22px] mb-1">{name}</h1>
          <div className="text-[10px] text-muted">{contactLines}</div>
        </div>
      )

    case 'centered-line':
      return (
        <div data-header="true" className="text-center mb-6 border-t border-border pt-4">
          <h1 className="font-bold text-[22px] mb-1">{name}</h1>
          <div className="text-[10px] text-muted">{contactLines}</div>
        </div>
      )

    case 'minimal':
      return (
        <div data-header="true" className="mb-6">
          <h1 className="font-bold text-[20px] mb-0.5">{name}</h1>
          <div className="text-[10px] text-muted">{contactLines}</div>
        </div>
      )

    case 'paper':
      return (
        <div data-header="true" className="text-center mb-6 bg-paper py-4 -mx-6 px-6">
          <h1 className="font-bold text-[22px] mb-1">{name}</h1>
          <div className="text-[10px] text-muted">{contactLines}</div>
        </div>
      )

    default:
      return (
        <div data-header="true" className="text-center mb-6">
          <h1 className="font-bold text-[22px] mb-1">{name}</h1>
          <div className="text-[10px] text-muted">{contactLines}</div>
        </div>
      )
  }
}

export function headingClass(style: TemplateStyle, _accentColor: string): string {
  const base = 'text-[13px] font-semibold uppercase tracking-wider mb-1.5'
  switch (style.heading) {
    case 'underline':
      return `${base} border-b border-border pb-1`
    case 'uppercase':
      return base
    case 'left-bar':
      return `${base} pl-2.5`
    case 'small-caps':
      return 'text-[13px] font-semibold tracking-wider mb-1.5'
    case 'dot-accent':
      return `${base} inline-block`
    case 'badge':
      return 'text-[11px] font-bold uppercase tracking-wider mb-2'
    default:
      return base
  }
}

export function headingStyle(style: TemplateStyle, accentColor: string): React.CSSProperties {
  switch (style.heading) {
    case 'left-bar':
      return { borderLeft: `3px solid ${accentColor}`, paddingLeft: '10px' }
    case 'badge':
      return { backgroundColor: accentColor, color: '#fff', display: 'inline-block', padding: '2px 10px', borderRadius: '3px' }
    case 'dot-accent':
      return { borderBottom: `2px dotted ${accentColor}`, paddingBottom: '2px', display: 'inline-block' }
    default:
      return { color: accentColor }
  }
}

export function bulletChar(style: TemplateStyle): string {
  switch (style.bullet) {
    case 'dash': return '\u2014'
    case 'arrow': return '\u25B8'
    case 'hyphen': return '\u2023'
    case 'check': return '\u2713'
    default: return '\u2022'
  }
}
