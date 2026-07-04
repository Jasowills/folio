import type { ReactNode } from 'react'
import type { ResumeRenderProps } from '../types'
import HeaderRenderer from '../renderers/HeaderRenderer'
import SummaryRenderer from '../renderers/SummaryRenderer'
import ExperienceRenderer from '../renderers/ExperienceRenderer'
import EducationRenderer from '../renderers/EducationRenderer'
import SkillsRenderer from '../renderers/SkillsRenderer'
import CertificationsRenderer from '../renderers/CertificationsRenderer'
import LanguagesRenderer from '../renderers/LanguagesRenderer'
import LinksRenderer from '../renderers/LinksRenderer'

export default function Sidebar({ data, design, style }: ResumeRenderProps) {
  return (
    <div className="flex gap-0">
      <div
        className="w-[36%] shrink-0 p-5 min-h-full"
        style={{ backgroundColor: design.primaryColor }}
      >
        <div className="text-white space-y-5">
          <div className="text-center">
            <h1 className="text-[16px] font-bold mb-2 text-white">{data.name}</h1>
            {data.contact.email && <p className="text-[9px] text-white/80">{data.contact.email}</p>}
            {data.contact.phone && <p className="text-[9px] text-white/80">{data.contact.phone}</p>}
            {data.contact.location && <p className="text-[9px] text-white/80">{data.contact.location}</p>}
          </div>

          <SkillsRenderer data={data} design={design} style={{ ...style, heading: 'uppercase' }} />
          <CertificationsRenderer data={data} design={design} style={{ ...style, heading: 'uppercase' }} />
          <LanguagesRenderer data={data} design={design} style={{ ...style, heading: 'uppercase' }} />
          <LinksRenderer data={data} design={design} style={{ ...style, heading: 'uppercase' }} />

          {data.contact.linkedin && (
            <div>
              <h3 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1">LinkedIn</h3>
              <p className="text-[8px] text-white/80">{data.contact.linkedin}</p>
            </div>
          )}
          {data.contact.github && (
            <div>
              <h3 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1">GitHub</h3>
              <p className="text-[8px] text-white/80">{data.contact.github}</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 p-5 space-y-4">
        <SummaryRenderer data={data} design={design} style={style} />
        <ExperienceRenderer data={data} design={design} style={{ ...style, spacing: 'compact' }} />
        <EducationRenderer data={data} design={design} style={style} />
      </div>
    </div>
  )
}
