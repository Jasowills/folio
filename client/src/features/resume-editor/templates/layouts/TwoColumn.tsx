import type { ResumeRenderProps } from '../types'
import HeaderRenderer from '../renderers/HeaderRenderer'
import SummaryRenderer from '../renderers/SummaryRenderer'
import ExperienceRenderer from '../renderers/ExperienceRenderer'
import EducationRenderer from '../renderers/EducationRenderer'
import SkillsRenderer from '../renderers/SkillsRenderer'
import CertificationsRenderer from '../renderers/CertificationsRenderer'
import LanguagesRenderer from '../renderers/LanguagesRenderer'
import LinksRenderer from '../renderers/LinksRenderer'

const SECTION_GAP_MAP = ['space-y-1', 'space-y-2', 'space-y-3', 'space-y-4', 'space-y-5']

const LEFT_SECTIONS = new Set(['summary', 'experience', 'education'])
const RIGHT_SECTIONS = new Set(['skills', 'certifications', 'languages', 'links'])

export default function TwoColumn({ data, design, style, sectionSpacing }: ResumeRenderProps) {
  const gap = SECTION_GAP_MAP[sectionSpacing ?? 3] ?? 'space-y-4'
  const sectionOrder = data.sectionOrder || []

  const leftSections = sectionOrder.filter(s => LEFT_SECTIONS.has(s))
  const rightSections = sectionOrder.filter(s => RIGHT_SECTIONS.has(s))

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary': return <SummaryRenderer key={key} data={data} design={design} style={style} />
      case 'experience': return <ExperienceRenderer key={key} data={data} design={design} style={style} />
      case 'education': return <EducationRenderer key={key} data={data} design={design} style={style} />
      case 'skills': return <SkillsRenderer key={key} data={data} design={design} style={style} />
      case 'certifications': return <CertificationsRenderer key={key} data={data} design={design} style={style} />
      case 'languages': return <LanguagesRenderer key={key} data={data} design={design} style={style} />
      case 'links': return <LinksRenderer key={key} data={data} design={design} style={style} />
      default: return null
    }
  }

  const leftContent = (
    <div className={gap}>
      {leftSections.map(renderSection)}
    </div>
  )

  const rightContent = (
    <div className={gap}>
      {rightSections.map(renderSection)}
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
