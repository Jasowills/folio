import type { DesignSettings } from '../../../../pages/editor/types'
import type { SectionHeaderStyle } from './types'

interface SectionHeaderProps {
  label: string
  design: DesignSettings
  style: SectionHeaderStyle
  index?: number
  className?: string
}

import UnderlineRuleHeader from './building-blocks/section-headers/UnderlineRuleHeader'
import ColoredTabHeader from './building-blocks/section-headers/ColoredTabHeader'
import IconPlusLabelHeader from './building-blocks/section-headers/IconPlusLabelHeader'
import SmallCapsHeader from './building-blocks/section-headers/SmallCapsHeader'
import NumberedHeader from './building-blocks/section-headers/NumberedHeader'
import NoneHeader from './building-blocks/section-headers/NoneHeader'

const SECTION_HEADER_MAP: Record<SectionHeaderStyle, React.FC<any>> = {
  'underline-rule': UnderlineRuleHeader,
  'colored-tab': ColoredTabHeader,
  'icon-plus-label': IconPlusLabelHeader,
  'small-caps-spaced': SmallCapsHeader,
  'numbered': NumberedHeader,
  'none': NoneHeader,
}

export default function ConfigurableSectionHeading({ label, design, style, index, className }: SectionHeaderProps) {
  const Component = SECTION_HEADER_MAP[style] || NoneHeader
  return <Component label={label} design={design} index={index} className={className} />
}
