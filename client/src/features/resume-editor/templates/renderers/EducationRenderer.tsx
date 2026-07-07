import type { TemplateStyle } from '../../../../templates/types'
import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import SectionHeading from './SectionHeading'
import { formatDate } from './utils'

interface Props {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
}

export default function EducationRenderer({ data, design, style }: Props) {
  if (!data.education || data.education.length === 0) return null

  return (
    <div className="mb-4">
      <SectionHeading label="Education" style={style} design={design} />
      {data.education.map((edu, i) => (
        <div key={i} className="mb-2 last:mb-0">
          <strong className="text-[12px]" style={{ lineHeight: design.lineSpacing }}>{edu.institution}</strong>
          <p className="text-[10px] text-muted" style={{ lineHeight: design.lineSpacing }}>
            {edu.degree}{edu.field ? ` \u2014 ${edu.field}` : ''}
            {(edu.startDate || edu.endDate) && (
              <span className="ml-2 text-[9px]">{formatDate(edu.startDate, edu.endDate)}</span>
            )}
          </p>
        </div>
      ))}
    </div>
  )
}
