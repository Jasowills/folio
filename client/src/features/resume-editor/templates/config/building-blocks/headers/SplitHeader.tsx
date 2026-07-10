import type { HeaderProps } from './types'
import { headingFontFamily } from '../../../renderers/utils'

export default function SplitHeader({ data, design, style, photoElement }: HeaderProps) {
  const contactItems = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
  ].filter(Boolean)

  const links = data.links.filter(l => l.title || l.url)

  return (
    <div className="flex justify-between items-start mb-5">
      <div>
        <h1 className="font-bold text-[22px] mb-1" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>
          {data.name}
        </h1>
        <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>
          {contactItems.join(' \u00B7 ')}
        </div>
      </div>
      <div className="text-right text-[9px] text-muted" style={{ lineHeight: design.lineSpacing }}>
        {links.map((l, i) => (
          <div key={i}>{l.title || l.url}</div>
        ))}
      </div>
    </div>
  )
}
