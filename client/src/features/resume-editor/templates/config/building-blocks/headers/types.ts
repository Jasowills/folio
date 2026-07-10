import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import type { TemplateStyle } from '../../../../templates/types'

export interface HeaderProps {
  data: LocalData
  design: DesignSettings
  style: TemplateStyle
  photoElement?: React.ReactNode
}
