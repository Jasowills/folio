import type { TemplateStyle } from '../../../../templates/types'
import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import SectionHeading from './SectionHeading'

interface Props {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
  className?: string
}

export default function CertificationsRenderer({ data, design, style, className = '' }: Props) {
  if (!data.certifications || data.certifications.length === 0) return null

  return (
    <div className={`mb-4 ${className}`}>
      <SectionHeading label="Certifications" style={style} design={design} />
      <div className="space-y-1 mt-1">
        {data.certifications.map((c, i) => (
          <p key={i} className="text-[11px] text-muted" style={{ lineHeight: design.lineSpacing }}>
            {c.name}{c.issuer ? ` \u2014 ${c.issuer}` : ''}
          </p>
        ))}
      </div>
    </div>
  )
}
