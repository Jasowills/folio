import type { HeaderProps } from './types'
import { headingFontFamily } from '../../../renderers/utils'

export default function FullBleedBandHeader({ data, design, style: _style, photoElement }: HeaderProps) {
  const contactItems = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
  ].filter(Boolean)

  const links = data.links.filter(l => l.title || l.url)

  return (
    <div
      className="text-white text-center py-6 px-8 mb-6"
      style={{
        backgroundColor: design.primaryColor,
        marginLeft: '-8mm',
        marginRight: '-8mm',
        marginTop: '-6mm',
      }}
    >
      {photoElement && <div className="flex justify-center mb-3">{photoElement}</div>}
      <h1 className="font-bold tracking-wide mb-1 text-[24px]" style={{ fontFamily: headingFontFamily(design), lineHeight: design.lineSpacing }}>
        {data.name}
      </h1>
      <div className="text-[10px] text-white/70" style={{ lineHeight: design.lineSpacing }}>
        {contactItems.join(' \u00B7 ')}
      </div>
      {links.length > 0 && (
        <div className="text-[9px] text-white/60 mt-1 flex justify-center gap-2 flex-wrap" style={{ lineHeight: design.lineSpacing }}>
          {links.map((l, i) => (
            <span key={i}>{l.title || l.url}</span>
          ))}
        </div>
      )}
    </div>
  )
}
