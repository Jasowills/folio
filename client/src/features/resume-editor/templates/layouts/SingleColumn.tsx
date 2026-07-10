import type { ResumeRenderProps } from '../types'
import HeaderRenderer from '../renderers/HeaderRenderer'
import SectionRenderer from '../renderers/SectionRenderer'

const SECTION_GAP_MAP = ['space-y-1', 'space-y-2', 'space-y-3', 'space-y-4', 'space-y-5']

export default function SingleColumn({ data, design, style, sectionSpacing }: ResumeRenderProps) {
  const spacing = SECTION_GAP_MAP[sectionSpacing ?? 3] ?? 'space-y-4'

  return (
    <div className={spacing}>
      <HeaderRenderer data={data} design={design} style={style} />
      <SectionRenderer data={data} design={design} style={style} className={spacing} />
    </div>
  )
}
