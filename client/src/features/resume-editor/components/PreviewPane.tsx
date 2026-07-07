import type { LocalData, DesignSettings } from '../../../pages/editor/types'
import type { TemplateId } from '../templates/types'
import { getTemplateStyle } from '../templates/registry'
import ResumePaper from './ResumePaper'
import HeaderRenderer from '../templates/renderers/HeaderRenderer'
import SummaryRenderer from '../templates/renderers/SummaryRenderer'
import ExperienceRenderer from '../templates/renderers/ExperienceRenderer'
import EducationRenderer from '../templates/renderers/EducationRenderer'
import SkillsRenderer from '../templates/renderers/SkillsRenderer'
import CertificationsRenderer from '../templates/renderers/CertificationsRenderer'
import LanguagesRenderer from '../templates/renderers/LanguagesRenderer'
import LinksRenderer from '../templates/renderers/LinksRenderer'

interface PreviewPaneProps {
  data: LocalData
  design: DesignSettings
  templateId: TemplateId
}

const SECTION_RENDERERS: Record<string, React.ComponentType<{ data: LocalData; design: DesignSettings; style: any }>> = {
  summary: SummaryRenderer,
  experience: ExperienceRenderer,
  education: EducationRenderer,
  skills: SkillsRenderer,
  certifications: CertificationsRenderer,
  languages: LanguagesRenderer,
  links: LinksRenderer,
}

export default function PreviewPane({ data, design, templateId }: PreviewPaneProps) {
  const style = getTemplateStyle(templateId)

  const visibleSections = data.sectionOrder.filter(s => {
    if (s === 'summary') return !!data.summary
    if (s === 'experience') return data.experience.length > 0
    if (s === 'education') return data.education.length > 0
    if (s === 'skills') return data.skills.length > 0
    if (s === 'certifications') return data.certifications.length > 0
    if (s === 'languages') return data.languages.length > 0
    if (s === 'links') return data.links.length > 0
    return false
  })

  const spacing = style.spacing === 'compact' ? 'space-y-3' : style.spacing === 'airy' ? 'space-y-5' : 'space-y-4'

  return (
    <div className="flex items-start justify-center py-8 min-h-full">
      <ResumePaper>
        <div
          className="px-[8mm] py-[6mm]"
          style={{
            fontFamily: design.bodyFont,
            color: design.secondaryColor,
          }}
        >
          <HeaderRenderer data={data} design={design} style={style} />
          <div className={spacing}>
            {visibleSections.map(key => {
              const Renderer = SECTION_RENDERERS[key]
              if (!Renderer) return null
              return <Renderer key={key} data={data} design={design} style={style} />
            })}
          </div>
        </div>
      </ResumePaper>
    </div>
  )
}
