import type { TemplateStyle } from '../../../../templates/types'
import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import SectionHeading from './SectionHeading'

interface Props {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
  className?: string
}

export default function LinksRenderer({ data, design, style, className = '' }: Props) {
  const links = data.links.filter(l => l.title || l.url)
  if (links.length === 0) return null

  return (
    <div className={`mb-4 ${className}`}>
      <SectionHeading label="Links" style={style} design={design} />
      <div className="space-y-0.5 mt-1">
        {links.map((l, i) => (
          <p key={i} className="text-[11px] text-muted" style={{ lineHeight: design.lineSpacing }}>
            <span style={{ color: design.primaryColor }} className="font-medium underline">{l.title || l.url}</span>
            {l.title && l.url ? ` \u2014 ${l.url}` : ''}
          </p>
        ))}
      </div>
    </div>
  )
}
