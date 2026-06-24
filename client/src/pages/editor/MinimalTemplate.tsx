import { cn } from '../../lib/utils'
import type { LocalData, ResumeShim, SectionName } from './types'

interface Props {
  resume: ResumeShim
  localData: LocalData
  redFlags: ResumeShim['redFlags']
  primaryColor?: string
  showSections?: Set<SectionName>
  pageIndex?: number
}

function hasBulletFlag(redFlags: ResumeShim['redFlags'], text: string): boolean {
  return (redFlags || []).some(
    (rf) => rf.section?.toLowerCase() === 'experience' && text.length > 0 && rf.message.toLowerCase().includes(text.toLowerCase().slice(0, 20)),
  )
}

function section(s: SectionName, show?: Set<SectionName>): boolean {
  return !show || show.has(s)
}

export function MinimalTemplate({ resume, localData, redFlags, primaryColor, showSections, pageIndex }: Props) {
  const hasIssue = (text?: string) => text && (redFlags || []).some((rf) => rf.message.includes(text || ''))
  const accentColor = primaryColor || '#0F6E56'
  const showHeader = pageIndex === undefined || pageIndex === 0
  const links = (localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url)
  return (
    <div className="font-sans text-[11px] leading-relaxed text-ink">
      {showHeader && (
      <div className="text-center mb-6">
        <h1 className="font-display text-[22px] font-bold text-ink mb-1">
          {localData.name || resume.name || 'Your Name'}
        </h1>
        <p className="text-[10px] text-muted">
          {localData.contact?.email || resume.contact?.email || ''}
          {localData.contact?.phone || resume.contact?.phone ? ` | ${localData.contact?.phone || resume.contact?.phone || ''}` : ''}
          {localData.contact?.location || resume.contact?.location ? ` | ${localData.contact?.location || resume.contact?.location || ''}` : ''}
          {links.map(l => l.url).filter(Boolean).join(' | ')}
        </p>
      </div>
      )}

      {section('summary', showSections) && (localData.summary || resume.summary) && (
        <div data-section="summary" className={cn('mb-5', hasIssue('summary') && 'border-l-2 border-amber pl-3 bg-amber/5')}>
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Summary</h2>
          <p className="text-[11px] text-muted leading-relaxed">{localData.summary || resume.summary}</p>
        </div>
      )}

      {section('experience', showSections) && (localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || []).length > 0 && (
        <div data-section="experience" className="mb-5">
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-2" style={{ color: accentColor }}>Experience</h2>
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
                      <li key={j} className="flex items-start gap-1.5 text-[11px] text-muted">
                        <span className="text-muted mt-0.5">•</span>
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
        <div data-section="education" className="mb-5">
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-2" style={{ color: accentColor }}>Education</h2>
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
        <div data-section="skills" className="mb-5">
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Skills</h2>
          <div className="flex flex-wrap gap-1">
            {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).filter(Boolean).map((s, i) => (
              <span key={i} className="text-[10px] bg-paper px-2 py-0.5 rounded text-muted">{s}</span>
            ))}
          </div>
        </div>
      )}

      {section('certifications', showSections) && (localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || []).length > 0 && (
        <div data-section="certifications" className="mb-5">
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Certifications</h2>
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
        <div data-section="languages">
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Languages</h2>
          <div className="flex flex-wrap gap-1.5">
            {(localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).filter(Boolean).map((l, i) => (
              <span key={i} className="text-[11px] text-muted">{l}</span>
            ))}
          </div>
        </div>
      )}

      {section('links', showSections) && (localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).length > 0 && (
        <div data-section="links" className="mt-5">
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>Links</h2>
          <div className="space-y-1">
            {(localData.links && localData.links.length > 0 ? localData.links : resume.links || []).filter(l => l.title || l.url).map((link, i) => (
              <p key={i} className="text-[11px]">
                <span className="text-ink">{link.title}</span>
                {link.url ? <span className="text-muted"> — {link.url}</span> : null}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
