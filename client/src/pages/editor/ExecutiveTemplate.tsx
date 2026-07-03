import type { LocalData, ResumeShim, SectionName } from './types'

interface Props {
  resume: ResumeShim
  localData: LocalData
  primaryColor?: string
  showSections?: Set<SectionName>
  pageIndex?: number
}

function section(s: SectionName, show?: Set<SectionName>): boolean {
  return !show || show.has(s)
}

export function ExecutiveTemplate({ resume, localData, primaryColor, showSections, pageIndex }: Props) {
  const accentColor = primaryColor || '#0F6E56'
  const showHeader = pageIndex === undefined || pageIndex === 0
  const links = (localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url)
  return (
    <div className="font-serif text-[11px] leading-relaxed">
      {showHeader && (
      <div className="bg-ink text-white text-center py-6 px-8 -mx-10 -mt-10 mb-6">
        <h1 className="font-serif text-[24px] font-bold tracking-wide mb-1">
          {localData.name || resume.name || 'Your Name'}
        </h1>
        <p className="text-[10px] text-white/70">
          {localData.contact?.email || resume.contact?.email || ''}
          {localData.contact?.phone || resume.contact?.phone ? ` | ${localData.contact?.phone || resume.contact?.phone || ''}` : ''}
          {localData.contact?.location || resume.contact?.location ? ` | ${localData.contact?.location || resume.contact?.location || ''}` : ''}
          {links.map((link, i) => (
            <span key={i}>
              {i > 0 && ' | '}
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-white underline decoration-from-font">{link.title || link.url}</a>
            </span>
          ))}
        </p>
      </div>
      )}

      {section('summary', showSections) && (localData.summary || resume.summary) && (
        <div data-section="summary" className="mb-5 break-inside-avoid">
          <h2 className="font-serif text-[14px] font-bold uppercase tracking-wider mb-1.5 border-b border-border pb-1" style={{ color: accentColor }}>Summary</h2>
          <p className="text-[11px] text-muted leading-relaxed mt-2">{localData.summary || resume.summary}</p>
        </div>
      )}

      {section('experience', showSections) && (localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || []).length > 0 && (
        <div data-section="experience" className="mb-5 break-inside-avoid">
          <h2 className="font-serif text-[14px] font-bold uppercase tracking-wider mb-2 border-b border-border pb-1" style={{ color: accentColor }}>Professional Experience</h2>
          {((localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || [])).map((exp, i) => (
            <div key={i} className="mt-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-bold text-ink">{exp.title}</p>
                  <p className="text-[10px] text-muted italic">{exp.company}</p>
                </div>
                <p className="text-[9px] text-muted whitespace-nowrap">
                  {exp.startDate || ''}{exp.startDate && exp.endDate ? ' — ' : ''}{exp.current ? 'Present' : exp.endDate || ''}
                </p>
              </div>
              {exp.bullets && exp.bullets.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {exp.bullets.filter((b: any) => typeof b === 'string').map((b: string, j: number) => (
                    <li key={j} className="flex items-start gap-1.5 text-[11px] text-muted">
                      <span className="text-ink mt-0.5">—</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {section('education', showSections) && (localData.education && localData.education.length > 0 ? localData.education : resume.education || []).length > 0 && (
        <div data-section="education" className="mb-5 break-inside-avoid">
          <h2 className="font-serif text-[14px] font-bold uppercase tracking-wider mb-2 border-b border-border pb-1" style={{ color: accentColor }}>Education</h2>
          {((localData.education && localData.education.length > 0 ? localData.education : resume.education || [])).map((edu, i) => (
            <div key={i} className="mt-2">
              <p className="text-[12px] font-bold text-ink">{edu.institution}</p>
              <p className="text-[10px] text-muted">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-4">
        {section('skills', showSections) && (localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).length > 0 && (
          <div data-section="skills" className="break-inside-avoid">
            <h2 className="font-serif text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Skills</h2>
            <div className="flex flex-wrap gap-1">
              {(localData.skills && localData.skills.length > 0 ? localData.skills.map(s => s.name) : resume.skills || []).filter(Boolean).map((s, i) => (
                <span key={i} className="text-[10px] bg-paper px-1.5 py-0.5 rounded text-muted">{s}</span>
              ))}
            </div>
          </div>
        )}
        {section('certifications', showSections) && (localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || []).length > 0 && (
          <div data-section="certifications" className="break-inside-avoid">
            <h2 className="font-serif text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Certifications</h2>
            {((localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || [])).map((c, i) => (
              <p key={i} className="text-[10px] text-muted">{c.name}{c.issuer ? ` — ${c.issuer}` : ''}</p>
            ))}
          </div>
        )}
      </div>

      {section('languages', showSections) && (localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).length > 0 && (
        <div data-section="languages" className="mt-4 break-inside-avoid">
          <h2 className="font-serif text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Languages</h2>
          <p className="text-[11px] text-muted">
            {(localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).filter(Boolean).join('  ·  ')}
          </p>
        </div>
      )}

      {section('links', showSections) && (localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).length > 0 && (
        <div data-section="links" className="mt-4 break-inside-avoid">
          <h2 className="font-serif text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Links</h2>
          <div className="space-y-1">
            {(localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).map((link, i) => (
              <p key={i} className="text-[10px] text-muted">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-ink font-medium underline decoration-from-font">{link.title || link.url}</a>
                {link.title && link.url ? <span className="text-muted"> — {link.url}</span> : null}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
