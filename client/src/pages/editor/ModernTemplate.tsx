import { cn } from '../../lib/utils'
import type { LocalData, ResumeShim, SectionName } from './types'
import type { TemplateStyle } from '../../templates/types'
import { fontClass, spacingClass, headingClass, headingStyle, bulletChar } from './template-utils'

interface Props {
  resume: ResumeShim
  localData: LocalData
  redFlags?: ResumeShim['redFlags']
  primaryColor?: string
  showSections?: Set<SectionName>
  pageIndex?: number
  templateStyle: TemplateStyle
}

export function ModernTemplate({ resume, localData, primaryColor, showSections, pageIndex, templateStyle }: Props) {
  function section(s: SectionName): boolean {
    return !showSections || showSections.has(s)
  }
  const showHeader = pageIndex === undefined || pageIndex === 0
  const accentColor = primaryColor || '#0F6E56'
  const bullet = bulletChar(templateStyle)
  const hClass = headingClass(templateStyle, accentColor)
  const hStyle = headingStyle(templateStyle, accentColor)

  return (
    <div className={cn('flex leading-relaxed h-full', fontClass(templateStyle.font), spacingClass(templateStyle.spacing))}>
      {showHeader && (
      <div data-header="true" className="w-[90px] min-h-full p-4 shrink-0" style={{ backgroundColor: accentColor }}>
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20 mx-auto mb-2" />
          <h1 className="font-bold text-[14px] text-white leading-tight">
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
          <div data-section="skills" className="mt-4 break-inside-avoid">
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">Skills</h2>
            <div className="flex flex-wrap gap-1">
              {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).filter(Boolean).map((s, i) => (
                <span key={i} className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-white/80">{s}</span>
              ))}
            </div>
          </div>
        )}

        {section('links') && (localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).length > 0 && (
          <div data-section="links" className="mt-4 break-inside-avoid">
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">Links</h2>
            <div className="space-y-1.5">
              {(localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).map((link, i) => (
                <p key={i} className="text-[8px] text-white/80 break-words">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-white underline decoration-from-font">{link.title || link.url}</a>
                  {link.title && link.url ? <span className="text-white/60"> — {link.url}</span> : null}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
      <div className="flex-1 p-5 space-y-4">
        {section('summary') && (localData.summary || resume.summary) && (
          <div data-section="summary" className="break-inside-avoid">
            <h2 className={hClass} style={hStyle}>Summary</h2>
            <p className="text-muted leading-relaxed">{localData.summary || resume.summary}</p>
          </div>
        )}
        {section('experience') && (localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || []).length > 0 && (
          <div data-section="experience" className="break-inside-avoid">
            <h2 className={hClass} style={hStyle}>Experience</h2>
            {((localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || [])).map((exp, i) => (
              <div key={i} className="mb-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink">{exp.title}</p>
                    <p className="text-muted text-[9px]">{exp.company}</p>
                  </div>
                  <p className="text-muted text-[8px] whitespace-nowrap">
                    {exp.startDate || ''}{exp.startDate && exp.endDate ? ' — ' : ''}{exp.current ? 'Present' : exp.endDate || ''}
                  </p>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.filter((b: any) => typeof b === 'string').map((b: string, j: number) => (
                      <li key={j} className="flex items-start gap-1 text-muted text-[9px]">
                        <span className="mt-0.5 shrink-0">{bullet}</span>
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
          <div data-section="education" className="break-inside-avoid">
            <h2 className={hClass} style={hStyle}>Education</h2>
            {((localData.education && localData.education.length > 0 ? localData.education : resume.education || [])).map((edu, i) => (
              <div key={i}>
                <p className="font-semibold text-ink">{edu.institution}</p>
                <p className="text-muted text-[9px]">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
              </div>
            ))}
          </div>
        )}
        {section('certifications') && (localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || []).length > 0 && (
          <div data-section="certifications" className="break-inside-avoid">
            <h2 className={hClass} style={hStyle}>Certifications</h2>
            <div className="space-y-0.5">
              {((localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || [])).map((c, i) => (
                <p key={i} className="text-[9px] text-muted">{c.name}{c.issuer ? ` — ${c.issuer}` : ''}</p>
              ))}
            </div>
          </div>
        )}
        {section('languages') && (localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).length > 0 && (
          <div data-section="languages" className="break-inside-avoid">
            <h2 className={hClass} style={hStyle}>Languages</h2>
            <p className="text-[9px] text-muted">
              {(localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).filter(Boolean).join('  ·  ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
