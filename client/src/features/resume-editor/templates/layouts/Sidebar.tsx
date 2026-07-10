import type { ResumeRenderProps } from '../types'
import SummaryRenderer from '../renderers/SummaryRenderer'
import ExperienceRenderer from '../renderers/ExperienceRenderer'
import EducationRenderer from '../renderers/EducationRenderer'
import SkillsRenderer from '../renderers/SkillsRenderer'
import CertificationsRenderer from '../renderers/CertificationsRenderer'
import LanguagesRenderer from '../renderers/LanguagesRenderer'
import LinksRenderer from '../renderers/LinksRenderer'

const SECTION_GAP_MAP = ['space-y-1', 'space-y-2', 'space-y-3', 'space-y-4', 'space-y-5']
const SIDEBAR_GAP_MAP = ['space-y-2', 'space-y-3', 'space-y-4', 'space-y-5', 'space-y-6']

const SIDEBAR_SECTIONS = new Set(['skills', 'certifications', 'languages', 'links'])
const MAIN_SECTIONS = new Set(['summary', 'experience', 'education'])

export default function Sidebar({ data, design, style, sectionSpacing }: ResumeRenderProps) {
  const sidebarGap = SIDEBAR_GAP_MAP[sectionSpacing ?? 3] ?? 'space-y-5'
  const mainGap = SECTION_GAP_MAP[sectionSpacing ?? 3] ?? 'space-y-4'
  const sectionOrder = data.sectionOrder || []

  const sidebarSections = sectionOrder.filter(s => SIDEBAR_SECTIONS.has(s))
  const mainSections = sectionOrder.filter(s => MAIN_SECTIONS.has(s))

  const renderSidebarSection = (key: string) => {
    switch (key) {
      case 'skills': return <SkillsRenderer key={key} data={data} design={design} style={{ ...style, heading: 'uppercase' }} />
      case 'certifications': return <CertificationsRenderer key={key} data={data} design={design} style={{ ...style, heading: 'uppercase' }} />
      case 'languages': return <LanguagesRenderer key={key} data={data} design={design} style={{ ...style, heading: 'uppercase' }} />
      case 'links': return <LinksRenderer key={key} data={data} design={design} style={{ ...style, heading: 'uppercase' }} />
      default: return null
    }
  }

  const renderMainSection = (key: string) => {
    switch (key) {
      case 'summary': return <SummaryRenderer key={key} data={data} design={design} style={style} />
      case 'experience': return <ExperienceRenderer key={key} data={data} design={design} style={{ ...style, spacing: 'compact' }} />
      case 'education': return <EducationRenderer key={key} data={data} design={design} style={style} />
      default: return null
    }
  }

  return (
    <div className="flex gap-0">
      <div
        className="w-[36%] shrink-0 p-5 min-h-full"
        style={{ backgroundColor: design.primaryColor }}
      >
        <div className={`text-white ${sidebarGap}`}>
          <div className="text-center">
            <h1 className="text-[16px] font-bold mb-2 text-white" style={{ lineHeight: design.lineSpacing }}>{data.name}</h1>
            {data.contact.email && <p className="text-[9px] text-white/80" style={{ lineHeight: design.lineSpacing }}>{data.contact.email}</p>}
            {data.contact.phone && <p className="text-[9px] text-white/80" style={{ lineHeight: design.lineSpacing }}>{data.contact.phone}</p>}
            {data.contact.location && <p className="text-[9px] text-white/80" style={{ lineHeight: design.lineSpacing }}>{data.contact.location}</p>}
          </div>

          {sidebarSections.map(renderSidebarSection)}

          {data.contact.linkedin && (
            <div>
              <h3 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1" style={{ lineHeight: design.lineSpacing }}>LinkedIn</h3>
              <p className="text-[8px] text-white/80" style={{ lineHeight: design.lineSpacing }}>{data.contact.linkedin}</p>
            </div>
          )}
          {data.contact.github && (
            <div>
              <h3 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1" style={{ lineHeight: design.lineSpacing }}>GitHub</h3>
              <p className="text-[8px] text-white/80" style={{ lineHeight: design.lineSpacing }}>{data.contact.github}</p>
            </div>
          )}
        </div>
      </div>
      <div className={`flex-1 p-5 ${mainGap}`}>
        {mainSections.map(renderMainSection)}
      </div>
    </div>
  )
}
