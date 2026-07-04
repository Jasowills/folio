import type { ResumeRenderProps } from '../types'
import HeaderRenderer from '../renderers/HeaderRenderer'
import SummaryRenderer from '../renderers/SummaryRenderer'
import ExperienceRenderer from '../renderers/ExperienceRenderer'
import EducationRenderer from '../renderers/EducationRenderer'
import SkillsRenderer from '../renderers/SkillsRenderer'
import CertificationsRenderer from '../renderers/CertificationsRenderer'
import LanguagesRenderer from '../renderers/LanguagesRenderer'
import LinksRenderer from '../renderers/LinksRenderer'

export default function SingleColumn({ data, design, style }: ResumeRenderProps) {
  const spacing = style.spacing === 'compact' ? 'space-y-3' : style.spacing === 'airy' ? 'space-y-5' : 'space-y-4'

  return (
    <div className={spacing}>
      <HeaderRenderer data={data} design={design} style={style} />
      <SummaryRenderer data={data} design={design} style={style} />
      <ExperienceRenderer data={data} design={design} style={style} />
      <EducationRenderer data={data} design={design} style={style} />
      <SkillsRenderer data={data} design={design} style={style} />
      <CertificationsRenderer data={data} design={design} style={style} />
      <LanguagesRenderer data={data} design={design} style={style} />
      <LinksRenderer data={data} design={design} style={style} />
    </div>
  )
}
