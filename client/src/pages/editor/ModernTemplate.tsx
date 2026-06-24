import type { LocalData, ResumeShim, SectionName } from './types'

interface Props {
  resume: ResumeShim
  localData: LocalData
  primaryColor?: string
  showSections?: Set<SectionName>
  pageIndex?: number
}

export function ModernTemplate({ resume, localData, primaryColor, showSections, pageIndex }: Props) {
  function section(s: SectionName): boolean {
    return !showSections || showSections.has(s)
  }
  const showHeader = pageIndex === undefined || pageIndex === 0
  return (
    <div className="flex text-[11px] leading-relaxed h-full">
      {showHeader && (
      <div className="w-[90px] min-h-full p-4 shrink-0" style={{ backgroundColor: primaryColor || '#0F6E56' }}>
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20 mx-auto mb-2" />
          <h1 className="font-display text-[14px] font-bold text-white leading-tight">
            {localData.name || resume.name || 'Your Name'}
          </h1>
        </div>
        <div className="space-y-3 text-white/80 text-[9px]">
          {localData.contact?.email || resume.contact?.email ? (
            <p className="break-words">{localData.contact?.email || resume.contact?.email}</p>
          ) : null}
          {localData.contact?.phone || resume.contact?.phone ? (
            <p>{localData.contact?.phone || resume.contact?.phone}</p>
          ) : null}
          {localData.contact?.location || resume.contact?.location ? (
            <p>{localData.contact?.location || resume.contact?.location}</p>
          ) : null}
        </div>
        {section('skills') && (localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).length > 0 && (
          <div data-section="skills" className="mt-4">
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">Skills</h2>
            <div className="flex flex-wrap gap-1">
              {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).filter(Boolean).map((s, i) => (
                <span key={i} className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-white/80">{s}</span>
              ))}
            </div>
          </div>
        )}

        {section('links') && (localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).length > 0 && (
          <div data-section="links" className="mt-4">
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">Links</h2>
            <div className="space-y-1.5">
              {(localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).map((link, i) => (
                <p key={i} className="text-[8px] text-white/80 break-words">
                  <span className="text-white/60">{link.title}</span>
                  {link.url ? <span> — {link.url}</span> : null}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
      <div className="flex-1 p-5 space-y-4">
        {section('summary') && (localData.summary || resume.summary) && (
          <div data-section="summary">
            <h2 className="font-display text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: primaryColor || '#0F6E56' }}>Summary</h2>
            <p className="text-[10px] text-muted leading-relaxed">{localData.summary || resume.summary}</p>
          </div>
        )}
        {section('experience') && (localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || []).length > 0 && (
          <div data-section="experience">
            <h2 className="font-display text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: primaryColor || '#0F6E56' }}>Experience</h2>
            {((localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || [])).map((exp, i) => (
              <div key={i} className="mb-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-ink">{exp.title}</p>
                    <p className="text-[9px] text-muted">{exp.company}</p>
                  </div>
                  <p className="text-[8px] text-muted whitespace-nowrap">
                    {exp.startDate || ''}{exp.startDate && exp.endDate ? ' — ' : ''}{exp.current ? 'Present' : exp.endDate || ''}
                  </p>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.filter((b: any) => typeof b === 'string').map((b: string, j: number) => (
                      <li key={j} className="flex items-start gap-1 text-[9px] text-muted">
                        <span className="mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {section('education') && (localData.education && localData.education.length > 0 ? localData.education : resume.education || []).length > 0 && (
          <div data-section="education">
            <h2 className="font-display text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: primaryColor || '#0F6E56' }}>Education</h2>
            {((localData.education && localData.education.length > 0 ? localData.education : resume.education || [])).map((edu, i) => (
              <div key={i}>
                <p className="text-[11px] font-semibold text-ink">{edu.institution}</p>
                <p className="text-[9px] text-muted">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
