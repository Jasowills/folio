import type { TemplateStyle } from '../../../../templates/types'
import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import SectionHeading from './SectionHeading'

interface Props {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
  suppressSectionHeading?: boolean
}

export default function SummaryRenderer({ data, design, style, suppressSectionHeading = false }: Props) {
  if (!data.summary) return null

  return (
    <div className="mb-4">
      <SectionHeading label="Summary" style={style} design={design} suppress={suppressSectionHeading} />
      <p className="text-muted mt-1" style={{ fontSize: `${design.bodyFontSize}px`, lineHeight: design.lineSpacing }}>{data.summary}</p>
    </div>
  )
}
