import type { TemplateStyle } from '../../../../templates/types'
import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import SectionHeading from './SectionHeading'

interface Props {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
  className?: string
  variant?: 'chips' | 'inline-list'
  suppressSectionHeading?: boolean
}

export default function SkillsRenderer({ data, design, style, className = '', variant = 'chips', suppressSectionHeading = false }: Props) {
  if (!data.skills || data.skills.length === 0) return null

  return (
    <div className={`mb-4 ${className}`}>
      <SectionHeading label="Skills" style={style} design={design} suppress={suppressSectionHeading} />
      {variant === 'inline-list' ? (
        <p className="text-[11px] text-muted mt-1" style={{ lineHeight: design.lineSpacing }}>
          {data.skills.map(s => s.name).join(', ')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1 mt-1">
          {data.skills.map((s, i) => (
            <span key={i} className="text-[10px] bg-paper px-2 py-0.5 rounded text-muted" style={{ lineHeight: design.lineSpacing }}>
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
