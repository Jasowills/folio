import type { TemplateStyle } from '../../../../templates/types'
import type { LocalData, DesignSettings } from '../../../../pages/editor/types'

interface Props {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
}

export default function HeaderRenderer({ data, design, style }: Props) {
  const contactItems = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
  ].filter(Boolean)

  const links = data.links.filter(l => l.title || l.url)

  switch (style.header) {
    case 'dark-block':
      return (
        <div className="bg-ink text-white text-center py-6 px-8 -mx-[6mm] -mt-[6mm] mb-6" style={{ marginLeft: `-${6 + design.margins * 3}mm`, marginRight: `-${6 + design.margins * 3}mm`, marginTop: `-${6 + design.margins * 3}mm` }}>
          <h1 className="font-bold tracking-wide mb-1 text-[24px]" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>
            {data.name}
          </h1>
          <div className="text-[10px] text-white/70" style={{ lineHeight: design.lineSpacing }}>{contactItems.join(' \u00B7 ')}</div>
          {links.length > 0 && (
            <div className="text-[9px] text-white/60 mt-1 flex justify-center gap-2 flex-wrap" style={{ lineHeight: design.lineSpacing }}>
              {links.map((l, i) => (
                <span key={i}>{l.title || l.url}</span>
              ))}
            </div>
          )}
        </div>
      )

    case 'thin-line':
      return (
        <div className="text-center mb-5 border-b border-border pb-3">
          <h1 className="font-bold text-[22px] mb-1" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>{data.name}</h1>
          <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>
            {contactItems.join(' \u00B7 ')}
            {links.length > 0 && (
              <span> \u00B7 {links.map(l => l.title || l.url).join(' \u007C ')}</span>
            )}
          </div>
        </div>
      )

    case 'left-accent':
      return (
        <div className="text-left mb-5" style={{ borderLeft: `3px solid ${design.primaryColor}`, paddingLeft: '12px' }}>
          <h1 className="font-bold text-[22px] mb-1" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>{data.name}</h1>
          <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>{contactItems.join(' \u00B7 ')}</div>
        </div>
      )

    case 'top-stripe':
      return (
        <div className="text-center mb-5 pt-8 relative">
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: design.primaryColor }} />
          <h1 className="font-bold text-[22px] mb-1" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>{data.name}</h1>
          <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>{contactItems.join(' \u00B7 ')}</div>
        </div>
      )

    case 'centered-line':
      return (
        <div className="text-center mb-5 border-t border-border pt-4">
          <h1 className="font-bold text-[22px] mb-1" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>{data.name}</h1>
          <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>{contactItems.join(' \u00B7 ')}</div>
        </div>
      )

    case 'minimal':
      return (
        <div className="mb-5">
          <h1 className="font-bold text-[20px] mb-0.5" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>{data.name}</h1>
          <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>{contactItems.join(' \u00B7 ')}</div>
        </div>
      )

    default:
      return (
        <div className="text-center mb-5">
          <h1 className="font-bold text-[22px] mb-1" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>{data.name}</h1>
          <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>{contactItems.join(' \u00B7 ')}</div>
        </div>
      )
  }
}

function headingFontFamily(design: DesignSettings): string {
  return `"${design.headingFont}", Georgia, "Times New Roman", serif`
}
