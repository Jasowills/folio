import type { TemplateStyle } from '../../../../templates/types'
import type { DesignSettings } from '../../../../pages/editor/types'
import { headingClasses, headingStyle } from './utils'

interface Props {
  label: string
  style: TemplateStyle
  design: DesignSettings
  className?: string
  suppress?: boolean
}

export default function SectionHeading({ label, style, design, className = '', suppress }: Props) {
  if (suppress) return null

  const hStyle = { ...headingStyle(style, design.primaryColor), lineHeight: design.lineSpacing }
  const hClasses = headingClasses(style)

  return (
    <h2 className={`${hClasses} ${className}`} style={hStyle}>
      {label}
    </h2>
  )
}
