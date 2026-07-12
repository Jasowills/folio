import type { ResumeRenderProps } from '../types'
import SummaryRenderer from './SummaryRenderer'
import ExperienceRenderer from './ExperienceRenderer'
import EducationRenderer from './EducationRenderer'
import SkillsRenderer from './SkillsRenderer'
import CertificationsRenderer from './CertificationsRenderer'
import LanguagesRenderer from './LanguagesRenderer'
import LinksRenderer from './LinksRenderer'

const SECTION_MAP: Record<string, React.FC<ResumeRenderProps>> = {
  summary: SummaryRenderer,
  experience: ExperienceRenderer,
  education: EducationRenderer,
  skills: SkillsRenderer,
  certifications: CertificationsRenderer,
  languages: LanguagesRenderer,
  links: LinksRenderer,
}

interface SectionRendererProps extends ResumeRenderProps {
  className?: string
}

export default function SectionRenderer({ data, design, style, className }: SectionRendererProps) {
  const sections = data.sectionOrder || []

  return (
    <div className={className}>
      {sections.map(key => {
        const Component = SECTION_MAP[key]
        if (!Component) return null
        return (
          <div key={key} data-section={key}>
            <Component data={data} design={design} style={style} />
          </div>
        )
      })}
    </div>
  )
}
