import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PdfViewer from './PdfViewer'
import { ScoreRing } from '../components/ScoreRing'

function ScoreHeroSection({ score, compact }: { score: number; compact?: boolean }) {
  const getInterpretation = (s: number) => {
    if (s >= 85) return 'Excellent. Your resume is highly competitive.'
    if (s >= 70) return 'Good foundation. Key gaps holding you back.'
    if (s >= 50) return 'Room for improvement. Major sections need work.'
    return 'Needs significant improvement. Start with the red flags.'
  }

  return (
    <div className="bg-ink text-white rounded-xl overflow-hidden">
      <div className={`flex items-center ${compact ? 'gap-4 p-5' : 'gap-10 p-8 pb-6'}`}>
        <ScoreRing score={score} size={compact ? 80 : 140} strokeWidth={compact ? 5 : 8} scoreClassName="text-white" />
        <div className="flex-1 pt-1">
          <span className="label-uppercase text-teal">Resume score</span>
          <h2 className={`font-display text-white mt-1 leading-tight ${compact ? 'text-sm' : 'text-h2'}`}>
            {getInterpretation(score)}
          </h2>
          {!compact && (
            <p className="text-small text-muted-light mt-2 max-w-lg">
              Your resume scores {score}/100 overall. The section breakdown below shows where you stand.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function IssueCard({ issue, index }: { issue: string; index: number }) {
  const isSerious = issue.toLowerCase().includes('missing') || issue.toLowerCase().includes('no')
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.08, duration: 0.3 }}
      className="card flex items-start gap-3"
    >
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${isSerious ? 'bg-danger-light text-danger' : 'bg-amber-light text-amber'}`}>
        {index + 1}
      </div>
      <div>
        <h4 className="font-body text-sm font-semibold text-ink">{issue.split('—')[0]?.trim() || issue}</h4>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">
          {issue.includes('—') ? issue.split('—')[1]?.trim() : `${isSerious ? 'This is a critical issue that significantly impacts your score.' : 'Addressing this will improve your ATS match rate.'}`}
        </p>
      </div>
    </motion.div>
  )
}

export interface GuestResultData {
  score: number
  title: string
  issues: string[]
  redFlags?: Array<{ message: string; reason?: string; severity: string; section: string }>
  sectionScores?: Record<string, number>
  resumeText?: string | null
  fileUrl?: string | null
  cloudinaryPublicId?: string | null
  detectedRole?: { role: string; seniority: string; industries: string[]; confidence: number }
  quality?: { overallQuality: number; layoutScore: number; linksScore: number; professionalismScore: number; readabilityScore: number; strengths: string[]; issues: string[]; suggestions: string[] }
  name?: string | null
  contact?: { email?: string | null; phone?: string | null; location?: string | null; linkedin?: string | null; website?: string | null; github?: string | null }
  summary?: string | null
  experience?: Array<{ company: string; title: string; startDate?: string | null; endDate?: string | null; current?: boolean; bullets: string[] }>
  education?: Array<{ institution: string; degree: string; field?: string | null; startDate?: string | null; endDate?: string | null; gpa?: string | null }>
  skills?: string[]
  certifications?: Array<{ name: string; issuer?: string | null; date?: string | null }>
  languages?: string[]
}

export default function GuestResult({
  data,
  onReset,
}: {
  data: GuestResultData
  onReset: () => void
}) {
  const [showFeatures, setShowFeatures] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownloadReport = useCallback(async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/export/guest-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'folio-report.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[GuestResult] download report failed:', e)
    } finally {
      setDownloading(false)
    }
  }, [data])

  useEffect(() => {
    const timer = setTimeout(() => setShowFeatures(true), 600)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    console.log(`[GuestResult] rendered — cloudinaryPublicId=${data.cloudinaryPublicId ? data.cloudinaryPublicId.slice(0, 40) + '...' : 'null'}, fileUrl=${data.fileUrl ? data.fileUrl.slice(0, 50) + '...' : 'null'}, issues=${data.issues.length}, resumeText=${data.resumeText ? data.resumeText.length + ' chars' : 'null'}`)
  }, [data])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-screen bg-paper flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-3 bg-surface border-b border-border shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="font-display text-ink text-lg font-bold">Folio</span>
          <span className="font-display text-teal text-2xl font-bold">&amp;</span>
          <span className="w-px h-5 bg-border mx-2" />
          <span className="text-sm font-medium text-ink truncate max-w-[240px]">{data.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="text-xs font-medium text-teal border border-teal/30 px-4 py-1.5 rounded-md hover:bg-teal/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloading ? 'Generating...' : 'Download Report'}
          </button>
          <Link to="/login" className="text-xs text-muted hover:text-teal transition-colors">Sign in</Link>
          <Link to="/login">
            <button className="text-xs font-medium text-white bg-teal px-4 py-1.5 rounded-md hover:bg-teal-dark transition-colors cursor-pointer">
              Get started
            </button>
          </Link>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left: Rendered PDF + highlighted text */}
        <div className="w-full lg:w-[45%] shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border bg-white">
          {data.cloudinaryPublicId && data.fileUrl ? (
            <PdfViewer fileUrl={data.fileUrl} className="p-4" />
          ) : data.resumeText ? (
            <div className="p-6">
              <h3 className="font-display text-xs text-muted uppercase tracking-wider mb-3">Extracted Text</h3>
              <pre className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans">{data.resumeText}</pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-xs">No preview available</div>
          )}
          {data.resumeText && data.issues.length > 0 && (
            <div className="border-t border-border px-6 py-4">
              <details className="group">
                <summary className="list-none flex items-center gap-2 text-xs font-semibold text-teal uppercase tracking-wider cursor-pointer hover:text-teal-dark transition-colors select-none">
                  <svg
                    className="h-3 w-3 text-teal transition-transform duration-200 group-open:rotate-90"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  View highlighted analysis
                </summary>
                <div className="mt-3 max-h-80 overflow-y-auto space-y-4">
                  {/* Contact */}
                  {data.contact && Object.values(data.contact).some(Boolean) && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">Contact</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-light">
                        {data.contact.email && (
                          <a href={`mailto:${data.contact.email}`} className="hover:text-teal transition-colors">{data.contact.email}</a>
                        )}
                        {data.contact.phone && <span>{data.contact.phone}</span>}
                        {data.contact.location && <span>{data.contact.location}</span>}
                        {data.contact.linkedin && (
                          <a href={data.contact.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">LinkedIn</a>
                        )}
                        {data.contact.github && (
                          <a href={data.contact.github} target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">GitHub</a>
                        )}
                        {data.contact.website && (
                          <a href={data.contact.website} target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">Portfolio</a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {data.summary && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">Summary</h4>
                      <p className="text-xs text-ink-light leading-relaxed">{data.summary}</p>
                    </div>
                  )}

                  {/* Experience */}
                  {data.experience && data.experience.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-1.5">Experience</h4>
                      <div className="space-y-2">
                        {data.experience.map((exp, i) => (
                          <div key={i} className="border-l-2 border-teal/20 pl-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-ink">{exp.title}</p>
                                <p className="text-[11px] text-muted">{exp.company}</p>
                              </div>
                              {(exp.startDate || exp.endDate) && (
                                <span className="text-[10px] text-muted-light shrink-0 mt-0.5">
                                  {exp.startDate || ''} – {exp.endDate || (exp.current ? 'Present' : '')}
                                </span>
                              )}
                            </div>
                            {exp.bullets && exp.bullets.length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {exp.bullets.filter(b => typeof b === 'string').map((b, j) => (
                                  <li key={j} className="text-[11px] text-ink-light leading-relaxed flex items-start gap-1.5">
                                    <span className="text-teal mt-1 shrink-0">•</span>
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {data.education && data.education.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-1.5">Education</h4>
                      <div className="space-y-2">
                        {data.education.map((edu, i) => (
                          <div key={i} className="border-l-2 border-teal/20 pl-2.5">
                            <p className="text-xs font-semibold text-ink">{edu.institution}</p>
                            <p className="text-[11px] text-muted">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</p>
                            {(edu.startDate || edu.endDate) && (
                              <p className="text-[10px] text-muted-light mt-0.5">{edu.startDate || ''} – {edu.endDate || ''}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {data.skills && data.skills.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-1.5">Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {data.skills.map((s, i) => (
                          <span key={i} className="text-[11px] text-ink bg-paper-dark px-2 py-0.5 rounded-md">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {data.certifications && data.certifications.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-1.5">Certifications</h4>
                      <div className="space-y-1">
                        {data.certifications.map((cert, i) => (
                          <div key={i} className="text-[11px] text-ink-light flex items-center gap-2">
                            <span className="text-teal">◆</span>
                            {cert.name}{cert.issuer ? <span className="text-muted"> · {cert.issuer}</span> : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {data.languages && data.languages.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">Languages</h4>
                      <p className="text-xs text-ink-light">{data.languages.join(', ')}</p>
                    </div>
                  )}

                  {/* Issue badges per section */}
                  {data.redFlags && data.redFlags.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-1.5">Issues by section</h4>
                      <div className="space-y-1">
                        {Object.entries(
                          data.redFlags.reduce<Record<string, { message: string; reason?: string; severity: string }[]>>((acc, f) => {
                            const s = f.section || 'general'
                            if (!acc[s]) acc[s] = []
                            acc[s].push({ message: f.message, reason: f.reason, severity: f.severity })
                            return acc
                          }, {})
                        ).map(([section, flags]) => (
                          <div key={section}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-semibold text-ink uppercase tracking-wider">{section}</span>
                              <span className="text-[10px] text-muted-light">({flags.length})</span>
                            </div>
                            <ul className="space-y-1.5">
                              {flags.map((f, j) => (
                                <li key={j}>
                                  <div className={`text-[11px] pl-2 border-l-2 ${f.severity === 'critical' ? 'border-danger text-danger' : 'border-amber text-amber-dark'}`}>
                                    <span>{f.message}</span>
                                    {f.reason && <div className="text-[10px] text-ink mt-0.5 leading-snug">{f.reason}</div>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Right: Analysis */}
        <div className="flex-1 overflow-y-auto bg-paper">
          <div className="max-w-xl mx-auto px-6 py-6 space-y-5">
            {/* Role badge */}
            {data.detectedRole && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Role</span>
                <span className="text-[11px] font-semibold text-ink bg-teal/10 px-2 py-0.5 rounded-md">{data.detectedRole.role}</span>
                <span className="text-[10px] text-muted">&middot;</span>
                <span className="text-[11px] font-medium text-ink capitalize">{data.detectedRole.seniority}</span>
                <span className="text-[9px] text-muted-light">{data.detectedRole.confidence}% confidence</span>
              </div>
            )}

            {/* Score */}
            <ScoreHeroSection score={data.score} compact />

            {/* Issue count */}
            <div>
              <h3 className="font-body font-semibold text-sm text-ink mb-3">
                {data.issues.length} issue{data.issues.length !== 1 ? 's' : ''} found
              </h3>
              <div className="space-y-2">
                {data.issues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} index={i} />
                ))}
              </div>
            </div>

            {/* Quality */}
            {data.quality && (
              <div className="card !shadow-sm">
                <h3 className="font-body font-semibold text-xs text-ink mb-2.5 uppercase tracking-wider">Resume quality</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                  {[
                    { label: 'Layout', value: data.quality.layoutScore },
                    { label: 'Links', value: data.quality.linksScore },
                    { label: 'Professionalism', value: data.quality.professionalismScore },
                    { label: 'Readability', value: data.quality.readabilityScore },
                  ].map((m) => (
                    <div key={m.label}>
                      <span className="label-uppercase text-[9px]" style={{ color: m.value >= 75 ? '#2D6A2D' : m.value >= 50 ? '#BA7517' : '#9B2335' }}>{m.label}</span>
                      <p className="font-display text-h4 text-ink mt-0.5">{Math.round(m.value)}</p>
                    </div>
                  ))}
                </div>
                {data.quality.suggestions.length > 0 && (
                  <div className="border-t border-border pt-2">
                    <span className="text-[10px] font-semibold text-teal block mb-1">Suggestions</span>
                    <ul className="space-y-0.5">
                      {data.quality.suggestions.map((s, i) => (
                        <li key={i} className="text-[11px] text-muted flex items-start gap-1.5"><span className="text-teal mt-0.5">+</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Features */}
            <AnimatePresence>
              {showFeatures && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                >
                  <div className="text-center mb-4">
                    <h3 className="font-display text-h4 text-ink">What you can do with Folio &amp;</h3>
                    <p className="text-[11px] text-muted mt-0.5">Free forever. No credit card needed.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, title: 'Fix every issue', desc: 'Rewrite bullets and strengthen your summary with AI.', iconBg: 'bg-teal-light' },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>, title: 'ATS score for any job', desc: 'Match against real job descriptions.', iconBg: 'bg-amber-light' },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, title: 'Cover letter', desc: 'Generated from your resume and JD.', iconBg: 'bg-teal-light' },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, title: 'Portfolio check', desc: 'Compare your site against your resume claims.', iconBg: 'bg-amber-light' },
                    ].map((f, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.3 }}
                        className="card p-3">
                        <div className={`h-8 w-8 rounded-lg ${f.iconBg} flex items-center justify-center mb-2`}>{f.icon}</div>
                        <h4 className="font-body text-xs font-semibold text-ink mb-0.5">{f.title}</h4>
                        <p className="text-[10px] text-muted leading-relaxed">{f.desc}</p>
                        <div className="flex items-center gap-1 mt-2 text-muted-light">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <span className="text-[9px]">Requires sign in</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reset */}
            <div className="text-center pb-4">
              <button onClick={onReset} className="text-xs text-muted hover:text-teal underline underline-offset-4 transition-colors">
                Analyse another resume
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
