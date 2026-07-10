import type { TemplateStyle } from '../../../../templates/types'
import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import SectionHeading from './SectionHeading'

interface Props {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
  className?: string
  suppressSectionHeading?: boolean
}

export default function LanguagesRenderer({ data, design, style, className = '', suppressSectionHeading = false }: Props) {
  if (!data.languages || data.languages.length === 0) return null

  return (
    <div className={`mb-4 ${className}`}>
      <SectionHeading label="Languages" style={style} design={design} suppress={suppressSectionHeading} />
      <p className="text-[11px] text-muted mt-1" style={{ lineHeight: design.lineSpacing }}>
        {data.languages.join(' \u00B7 ')}
      </p>
    </div>
  )
}
