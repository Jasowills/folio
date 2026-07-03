import { ScoreRing } from '../ScoreRing'
import { IconX, IconExternalLink, IconCalendar, IconMapPin, IconBriefcase, IconLanguage } from '@tabler/icons-react'
import { decodeHtml, formatJobDescription, extractUrl } from '../../lib/utils'

interface FeedJobDetailsPanelProps {
  job: any
  onClose: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  greenhouse: 'Greenhouse', lever: 'Lever', workday: 'Workday',
  weworkremotely: 'WeWorkRemotely', remoteok: 'RemoteOK', otta: 'Otta',
  hn: 'Hacker News', ycombinator: 'YC', twitter: 'Twitter', linkedin: 'LinkedIn',
  cryptojobslist: 'CryptoJobsList', bitcoinerjobs: 'BitcoinerJobs',
  remotive: 'Remotive', arc: 'Arc', wellfound: 'Wellfound', builtin: 'Built In', techtree: 'TechTree',
}

export default function FeedJobDetailsPanel({ job, onClose }: FeedJobDetailsPanelProps) {
  const match = job.match
  const score = match?.atsScore ?? 0
  const postedDate = job.postedAt ? new Date(job.postedAt) : null
  const timeSince = postedDate ? getTimeSince(postedDate) : ''
  const ef = job.extractedFields || {}
  const missingKeywords = match?.missingKeywords || []
  const matchedKeywords = match?.matchedKeywords || []

  const applyUrl = job.applicationUrl || extractUrl(job.descriptionRaw || '')

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/20" />
      <div
        className="w-full max-w-[520px] bg-surface h-full shadow-modal overflow-y-auto animate-slide-in-right relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border z-10">
          <div className="flex items-center justify-between px-5 py-3">
            <button onClick={onClose} className="p-1.5 -ml-1.5 text-muted hover:text-ink rounded-lg hover:bg-paper-dark transition-colors">
              <IconX className="h-5 w-5" />
            </button>
            <span className="text-[11px] font-medium bg-paper-dark text-muted px-2 py-1 rounded">
              {SOURCE_LABELS[job.source] || job.source}
            </span>
          </div>
          <div className="px-5 pb-4 flex items-start gap-4">
            <ScoreRing score={score} size={52} strokeWidth={4} scoreClassName="font-display font-bold" />
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="font-display text-h4 text-ink leading-snug">{job.roleTitle || 'Unknown Role'}</h2>
              <p className="text-sm text-muted mt-0.5">{job.companyName || 'Unknown Company'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs text-muted">
                {(job.isRemote || job.location) && (
                  <span className="flex items-center gap-1 bg-paper-dark px-1.5 py-0.5 rounded">
                    <IconMapPin className="h-3 w-3" />
                    {job.isRemote ? 'Remote' : job.location}
                  </span>
                )}
                {ef.experienceLevel && (
                  <span className="flex items-center gap-1 bg-paper-dark px-1.5 py-0.5 rounded">
                    <IconBriefcase className="h-3 w-3" />
                    {ef.experienceLevel}
                  </span>
                )}
                {postedDate && (
                  <span className="flex items-center gap-1">
                    <IconCalendar className="h-3 w-3" />
                    {timeSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Salary */}
          {ef.salaryMin && (
            <div>
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">Salary</h3>
              <p className="text-lg font-semibold text-amber">
                {formatSalary(ef.salaryMin, ef.salaryMax, ef.salaryCurrency)}
              </p>
            </div>
          )}

          {/* Languages */}
          {ef.languages?.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Languages</h3>
              <div className="flex flex-wrap gap-1.5">
                {ef.languages.map((lang: string) => (
                  <span key={lang} className="text-xs font-medium bg-teal-light text-teal px-2 py-0.5 rounded">{lang}</span>
                ))}
              </div>
            </div>
          )}

          {/* ATS Match details */}
          {match && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Match analysis</h3>
                <span className="text-xs font-medium text-ink">{matchedKeywords.length} of {matchedKeywords.length + missingKeywords.length} skills matched</span>
              </div>
              {match.matchIntelligenceLine && (
                <p className="text-xs text-muted mb-3 leading-relaxed">{match.matchIntelligenceLine}</p>
              )}
              {matchedKeywords.length + missingKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {matchedKeywords.slice(0, 20).map((kw: string) => (
                    <span key={kw} className="text-xs font-medium bg-success-light text-success px-2 py-0.5 rounded">{kw}</span>
                  ))}
                  {missingKeywords.slice(0, 20).map((kw: string) => (
                    <span key={kw} className="text-xs font-medium bg-danger-light text-danger px-2 py-0.5 rounded">{kw}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {job.descriptionRaw && (
            <div>
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Description</h3>
              <div className="text-sm text-ink leading-relaxed space-y-2">
                {formatJobDescription(job.descriptionRaw).split('\n\n').map((block, i) => {
                  const lines = block.split('\n')
                  const trimmed = lines[0]?.trim() || ''
                  const isSectionHeading = lines.length === 1 &&
                    trimmed.length > 1 && trimmed.length < 80 &&
                    /^[A-Z][A-Za-z\s/:',]+$/.test(trimmed) &&
                    !trimmed.endsWith('.')
                  if (isSectionHeading) {
                    return (
                      <h4 key={i} className="text-sm font-semibold text-ink mt-3 first:mt-0">
                        {decodeHtml(lines[0].trim())}
                      </h4>
                    )
                  }
                  if (lines.length === 1) {
                    return (
                      <p key={i} className="text-sm text-ink leading-relaxed">
                        {decodeHtml(lines[0])}
                      </p>
                    )
                  }
                  return (
                    <div key={i} className="space-y-1">
                      {lines.map((line, j) => {
                        const trimmed = line.trim()
                        if (!trimmed) return null
                        const isBullet = trimmed.startsWith('•')
                        if (isBullet) {
                          return (
                            <p key={j} className="text-sm text-ink leading-relaxed pl-3">
                              {decodeHtml(trimmed)}
                            </p>
                          )
                        }
                        return (
                          <p key={j} className="text-sm text-ink leading-relaxed">
                            {decodeHtml(trimmed)}
                          </p>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Apply link */}
          {applyUrl && (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors sticky bottom-0"
            >
              <IconExternalLink className="h-4 w-4" />
              View original posting
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSalary(min: number, max: number | null, currency: string | null): string {
  const fmt = (n: number) => {
    if (n >= 1000) return `${currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}${Math.round(n / 1000)}K`
    return `${currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}${n}`
  }
  if (max) return `${fmt(min)} – ${fmt(max)}`
  return `${fmt(min)}+`
}
