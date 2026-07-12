import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import type { TemplateConfig } from './types'

interface SidebarContentProps {
  data: LocalData
  design: DesignSettings
  config: TemplateConfig
  photoElement?: React.ReactNode
}

export default function SidebarContent({ data, design, config: _config, photoElement }: SidebarContentProps) {
  const sections = data.sectionOrder || []

  const sidebarSections = sections.filter(s =>
    ['skills', 'certifications', 'languages', 'links'].includes(s)
  )

  return (
    <div className="text-white">
      <div className="text-center mb-4">
        {photoElement && <div className="flex justify-center mb-3">{photoElement}</div>}
        <h1 className="text-[16px] font-bold mb-2 text-white" style={{ lineHeight: design.lineSpacing }}>
          {data.name}
        </h1>
        {data.contact.email && (
          <p className="text-[9px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
            {data.contact.email}
          </p>
        )}
        {data.contact.phone && (
          <p className="text-[9px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
            {data.contact.phone}
          </p>
        )}
        {data.contact.location && (
          <p className="text-[9px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
            {data.contact.location}
          </p>
        )}
      </div>

      {sidebarSections.map(key => (
        <div key={key} className="mb-3">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1" style={{ lineHeight: design.lineSpacing }}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </h3>
          {key === 'skills' && data.skills.map((s, i) => (
            <p key={i} className="text-[8px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
              {s.name}
            </p>
          ))}
          {key === 'certifications' && data.certifications.map((c, i) => (
            <p key={i} className="text-[8px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
              {c.name}
            </p>
          ))}
          {key === 'languages' && data.languages.map((l, i) => (
            <p key={i} className="text-[8px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
              {l}
            </p>
          ))}
          {key === 'links' && data.links.map((l, i) => (
            <p key={i} className="text-[8px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
              {l.title || l.url}
            </p>
          ))}
        </div>
      ))}

      {data.contact.linkedin && (
        <div className="mb-2">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1" style={{ lineHeight: design.lineSpacing }}>
            LinkedIn
          </h3>
          <p className="text-[8px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
            {data.contact.linkedin}
          </p>
        </div>
      )}
      {data.contact.github && (
        <div className="mb-2">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1" style={{ lineHeight: design.lineSpacing }}>
            GitHub
          </h3>
          <p className="text-[8px] text-white/80" style={{ lineHeight: design.lineSpacing }}>
            {data.contact.github}
          </p>
        </div>
      )}
    </div>
  )
}
