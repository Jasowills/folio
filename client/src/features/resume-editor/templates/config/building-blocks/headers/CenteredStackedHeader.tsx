import type { HeaderProps } from './types'
import { headingFontFamily } from '../../../renderers/utils'

export default function CenteredStackedHeader({ data, design, style, photoElement }: HeaderProps) {
  const contactItems = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
  ].filter(Boolean)

  const links = data.links.filter(l => l.title || l.url)

  return (
    <div className="text-center mb-5">
      {photoElement && <div className="flex justify-center mb-3">{photoElement}</div>}
      <h1 className="font-bold text-[22px] mb-1" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>
        {data.name}
      </h1>
      <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>
        {contactItems.join(' \u00B7 ')}
        {links.length > 0 && (
          <span> \u00B7 {links.map(l => l.title || l.url).join(' \u007C ')}</span>
        )}
      </div>
    </div>
  )
}
