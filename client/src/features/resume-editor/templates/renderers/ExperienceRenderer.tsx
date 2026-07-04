import type { TemplateStyle } from '../../../../templates/types'
import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import SectionHeading from './SectionHeading'
import { bulletChar, formatDate } from './utils'

interface Props {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
}

export default function ExperienceRenderer({ data, design, style }: Props) {
  if (!data.experience || data.experience.length === 0) return null

  const bullet = bulletChar(style)
  const compact = style.spacing === 'compact'
  const airy = style.spacing === 'airy'

  return (
    <div className={`mb-4 ${airy ? 'space-y-4' : compact ? 'space-y-2' : 'space-y-3'}`}>
      <SectionHeading label="Experience" style={style} design={design} />
      {data.experience.map((exp, i) => (
        <div key={i}>
          <div className="flex items-center justify-between gap-2">
            <strong className={compact ? 'text-[11px]' : 'text-[12px]'}>{exp.title}</strong>
            <span className="text-[9px] text-muted whitespace-nowrap">{formatDate(exp.startDate, exp.endDate, exp.current)}</span>
          </div>
          <p className="text-[10px] text-muted mb-1">{exp.company}</p>
          {exp.bullets.filter(Boolean).length > 0 && (
            <ul className={`list-none ${compact ? 'space-y-0.5' : 'space-y-1'}`}>
              {exp.bullets.filter(Boolean).map((b, j) => (
                <li key={j} className="text-muted flex gap-1.5">
                  <span className="shrink-0" style={{ color: design.primaryColor }}>{bullet}</span>
                  <span className={compact ? 'text-[10px]' : 'text-[11px]'}>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
