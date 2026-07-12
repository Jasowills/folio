import type { HeaderProps } from './types'
import { headingFontFamily } from '../../../renderers/utils'

export default function CardBlockHeader({ data, design, style: _style, photoElement }: HeaderProps) {
  const contactItems = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
  ].filter(Boolean)

  const links = data.links.filter(l => l.title || l.url)

  return (
    <div
      className="p-4 mb-5 rounded"
      style={{
        border: `1px solid ${design.primaryColor}`,
        backgroundColor: `${design.primaryColor}08`,
      }}
    >
      <div className="flex items-center gap-3">
        {photoElement}
        <div>
          <h1 className="font-bold text-[20px] mb-1" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>
            {data.name}
          </h1>
          <div className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>
            {contactItems.join(' \u00B7 ')}
          </div>
        </div>
      </div>
      {links.length > 0 && (
        <div className="text-[9px] text-muted mt-1 flex gap-2 flex-wrap" style={{ lineHeight: design.lineSpacing }}>
          {links.map((l, i) => (
            <span key={i}>{l.title || l.url}</span>
          ))}
        </div>
      )}
    </div>
  )
}
