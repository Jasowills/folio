import type { ResumeRenderProps } from '../types'
import HeaderRenderer from '../renderers/HeaderRenderer'
import SummaryRenderer from '../renderers/SummaryRenderer'
import ExperienceRenderer from '../renderers/ExperienceRenderer'
import EducationRenderer from '../renderers/EducationRenderer'
import SkillsRenderer from '../renderers/SkillsRenderer'
import CertificationsRenderer from '../renderers/CertificationsRenderer'
import LanguagesRenderer from '../renderers/LanguagesRenderer'
import LinksRenderer from '../renderers/LinksRenderer'

export default function TwoColumn({ data, design, style }: ResumeRenderProps) {
  const leftContent = (
    <div className="space-y-4">
      <HeaderRenderer data={data} design={design} style={style} />
      <SummaryRenderer data={data} design={design} style={style} />
      <ExperienceRenderer data={data} design={design} style={style} />
      <EducationRenderer data={data} design={design} style={style} />
    </div>
  )

  const rightContent = (
    <div className="space-y-4">
      <SkillsRenderer data={data} design={design} style={style} />
      <CertificationsRenderer data={data} design={design} style={style} />
      <LanguagesRenderer data={data} design={design} style={style} />
      <LinksRenderer data={data} design={design} style={style} />
    </div>
  )

  if (style.header === 'dark-block') {
    return (
      <div>
        <HeaderRenderer data={data} design={design} style={style} />
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3">{leftContent}</div>
          <div className="col-span-2">{rightContent}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-4">
      <div className="col-span-3">{leftContent}</div>
      <div className="col-span-2">{rightContent}</div>
    </div>
  )
}
