import { cn } from '../../lib/utils'
import type { LocalData, ResumeShim, SectionName } from './types'
import type { TemplateStyle } from '../../templates/types'
import { fontClass, spacingClass, renderHeader, headingClass, headingStyle, bulletChar } from './template-utils'

interface Props {
  resume: ResumeShim
  localData: LocalData
  redFlags: ResumeShim['redFlags']
  primaryColor?: string
  showSections?: Set<SectionName>
  pageIndex?: number
  templateStyle: TemplateStyle
}

function hasBulletFlag(redFlags: ResumeShim['redFlags'], text: string): boolean {
  return (redFlags || []).some(
    (rf) => rf.section?.toLowerCase() === 'experience' && text.length > 0 && rf.message.toLowerCase().includes(text.toLowerCase().slice(0, 20)),
  )
}

function section(s: SectionName, show?: Set<SectionName>): boolean {
  return !show || show.has(s)
}

export function MinimalTemplate({ resume, localData, redFlags, primaryColor, showSections, pageIndex, templateStyle }: Props) {
  const hasIssue = (text?: string) => text && (redFlags || []).some((rf) => rf.message.includes(text || ''))
  const accentColor = primaryColor || '#0F6E56'
  const links = (localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url)
  const bullet = bulletChar(templateStyle)
  const hClass = headingClass(templateStyle, accentColor)
  const hStyle = headingStyle(templateStyle, accentColor)

  const contactLines = (
    <>
      {localData.contact?.email || resume.contact?.email || ''}
      {localData.contact?.phone || resume.contact?.phone ? ` | ${localData.contact?.phone || resume.contact?.phone || ''}` : ''}
      {localData.contact?.location || resume.contact?.location ? ` | ${localData.contact?.location || resume.contact?.location || ''}` : ''}
      {links.map((link, i) => (
        <span key={i}>
          {i > 0 && ' | '}
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline decoration-from-font" style={{ color: accentColor }}>{link.title || link.url}</a>
        </span>
      ))}
    </>
  )

  return (
    <div className={cn(fontClass(templateStyle.font), 'leading-relaxed text-ink', spacingClass(templateStyle.spacing))}>
      {renderHeader(templateStyle, localData.name || resume.name || 'Your Name', contactLines, accentColor, pageIndex)}

      {section('summary', showSections) && (localData.summary || resume.summary) && (
        <div data-section="summary" className={cn('mb-5 break-inside-avoid', hasIssue('summary') && 'border-l-2 border-amber pl-3 bg-amber/5')}>
          <h2 className={hClass} style={hStyle}>Summary</h2>
          <p className="text-muted leading-relaxed mt-2">{localData.summary || resume.summary}</p>
        </div>
      )}

      {section('experience', showSections) && (localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || []).length > 0 && (
        <div data-section="experience" className="mb-5 break-inside-avoid">
          <h2 className={hClass} style={hStyle}>Experience</h2>
          <div className="space-y-3">
            {((localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || [])).map((exp, i) => (
              <div key={i} className={cn(exp.bullets?.some((b: string) => hasBulletFlag(redFlags, b)) && 'border-l-2 border-amber pl-3 bg-amber/5')}>
                <div className="flex items-start justify-between mb-0.5">
                  <div>
                    <p className="text-[12px] font-semibold text-ink">{exp.title}</p>
                    <p className="text-[10px] text-muted">{exp.company}</p>
                  </div>
                  <p className="text-[9px] text-muted whitespace-nowrap ml-2">
                    {exp.startDate || ''}{exp.startDate && exp.endDate ? ' — ' : ''}{exp.current ? 'Present' : exp.endDate || ''}
                  </p>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.filter((b: any) => typeof b === 'string').map((b: string, j: number) => (
                      <li key={j} className="flex items-start gap-1.5 text-muted">
                        <span className="text-muted mt-0.5 shrink-0">{bullet}</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {section('education', showSections) && (localData.education && localData.education.length > 0 ? localData.education : resume.education || []).length > 0 && (
        <div data-section="education" className="mb-5 break-inside-avoid">
          <h2 className={hClass} style={hStyle}>Education</h2>
          <div className="space-y-2">
            {((localData.education && localData.education.length > 0 ? localData.education : resume.education || [])).map((edu, i) => (
              <div key={i}>
                <p className="text-[12px] font-semibold text-ink">{edu.institution}</p>
                <p className="text-[10px] text-muted">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {section('skills', showSections) && (localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).length > 0 && (
        <div data-section="skills" className="mb-5 break-inside-avoid">
          <h2 className={hClass} style={hStyle}>Skills</h2>
          <div className="flex flex-wrap gap-1">
            {(localData.skills && localData.skills.length > 0 ? localData.skills.map(s => s.name) : resume.skills || []).filter(Boolean).map((s, i) => (
              <span key={i} className="text-[10px] bg-paper px-2 py-0.5 rounded text-muted">{s}</span>
            ))}
          </div>
        </div>
      )}

      {section('certifications', showSections) && (localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || []).length > 0 && (
        <div data-section="certifications" className="mb-5 break-inside-avoid">
          <h2 className={hClass} style={hStyle}>Certifications</h2>
          <div className="space-y-1">
            {((localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || [])).map((c, i) => (
              <p key={i} className="text-[11px]">
                <span className="font-medium text-ink">{c.name}</span>
                {c.issuer ? <span className="text-muted"> — {c.issuer}</span> : null}
              </p>
            ))}
          </div>
        </div>
      )}

      {section('languages', showSections) && (localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).length > 0 && (
        <div data-section="languages" className="mb-5 break-inside-avoid">
          <h2 className={hClass} style={hStyle}>Languages</h2>
          <div className="flex flex-wrap gap-1.5">
            {(localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).filter(Boolean).map((l, i) => (
              <span key={i} className="text-muted">{l}</span>
            ))}
          </div>
        </div>
      )}

      {section('links', showSections) && (localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).length > 0 && (
        <div data-section="links" className="mb-5 break-inside-avoid">
          <h2 className={hClass} style={hStyle}>Links</h2>
          <div className="space-y-1 mt-1">
            {(localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).map((link, i) => (
              <p key={i}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: accentColor }} className="underline decoration-from-font">{link.title || link.url}</a>
                {link.title && link.url ? <span className="text-muted"> — {link.url}</span> : null}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
