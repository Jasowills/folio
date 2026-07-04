import type { TemplateStyle } from '../../../../templates/types'
import type { DesignSettings } from '../../../../pages/editor/types'
import { headingClasses, headingStyle } from './utils'

interface Props {
  label: string
  style: TemplateStyle
  design: DesignSettings
  className?: string
}

export default function SectionHeading({ label, style, design, className = '' }: Props) {
  const hStyle = headingStyle(style, design.primaryColor)
  const hClasses = headingClasses(style)

  if (style.heading === 'badge') {
    return (
      <h2 className={`${hClasses} ${className}`} style={hStyle}>
        {label}
      </h2>
    )
  }

  return (
    <h2 className={`${hClasses} ${className}`} style={hStyle}>
      {label}
    </h2>
  )
}
