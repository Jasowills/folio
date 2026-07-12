import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import type { TemplateStyle } from '../../../../templates/types'
import type { SectionHeaderStyle } from './types'
import ConfigurableSectionHeading from './ConfigurableSectionHeading'

import SummaryRenderer from '../renderers/SummaryRenderer'
import ExperienceRenderer from '../renderers/ExperienceRenderer'
import EducationRenderer from '../renderers/EducationRenderer'
import SkillsRenderer from '../renderers/SkillsRenderer'
import CertificationsRenderer from '../renderers/CertificationsRenderer'
import LanguagesRenderer from '../renderers/LanguagesRenderer'
import LinksRenderer from '../renderers/LinksRenderer'

const SECTION_MAP: Record<string, React.FC<any>> = {
  summary: SummaryRenderer,
  experience: ExperienceRenderer,
  education: EducationRenderer,
  skills: SkillsRenderer,
  certifications: CertificationsRenderer,
  languages: LanguagesRenderer,
  links: LinksRenderer,
}

interface ConfigurableSectionRendererProps {
  data: LocalData
  design: DesignSettings
  templateStyle: TemplateStyle
  sectionHeaderStyle: SectionHeaderStyle
  className?: string
  sectionSpacing?: number
}

const SECTION_GAP_MAP = ['space-y-1', 'space-y-2', 'space-y-3', 'space-y-4', 'space-y-5']

export default function ConfigurableSectionRenderer({
  data,
  design,
  templateStyle,
  sectionHeaderStyle,
  className = '',
  sectionSpacing = 3,
}: ConfigurableSectionRendererProps) {
  const sections = data.sectionOrder || []
  const gap = SECTION_GAP_MAP[sectionSpacing] ?? 'space-y-4'

  return (
    <div className={`${gap} ${className}`}>
      {sections.map((key, index) => {
        const Component = SECTION_MAP[key]
        if (!Component) return null

        return (
          <div key={key} data-section={key} className="mb-4">
            <ConfigurableSectionHeading
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              design={design}
              style={sectionHeaderStyle}
              index={index}
            />
            <Component
              data={data}
              design={design}
              style={templateStyle}
              suppressSectionHeading={true}
            />
          </div>
        )
      })}
    </div>
  )
}
