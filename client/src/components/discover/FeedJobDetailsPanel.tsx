import { ScoreRing } from '../ScoreRing'
import { useTrackJob, useDeleteTrackerJob, useApplyOdds } from '../../lib/queries'
import { cn, decodeHtml, formatJobDescription, extractUrl } from '../../lib/utils'
import { IconExternalLink, IconMapPin, IconCalendar, IconBriefcase, IconBookmark, IconBookmarkFilled, IconSend, IconCompass } from '@tabler/icons-react'

interface FeedJobDetailsPanelProps {
  job: any | null
  onApprove?: (jobId: string) => void
  approvePending?: boolean
}

export default function FeedJobDetailsPanel({ job, onApprove, approvePending }: FeedJobDetailsPanelProps) {
  const trackJob = useTrackJob()
  const untrackJob = useDeleteTrackerJob()
  const { data: odds } = useApplyOdds(job?._id)

  if (!job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="h-16 w-16 rounded-2xl bg-paper-dark flex items-center justify-center mb-4">
          <IconCompass className="h-7 w-7 text-muted-light" />
        </div>
        <p className="text-sm font-medium text-ink">Select a job to view details</p>
        <p className="text-xs text-muted mt-1 max-w-[200px]">
          Click on any job listing to see its full description, match analysis, and actions
        </p>
      </div>
    )
  }

  const match = job.match
  const score = match?.atsScore ?? 0
  const postedDate = job.postedAt ? new Date(job.postedAt) : null
  const timeSince = postedDate ? getTimeSince(postedDate) : ''
  const ef = job.extractedFields || {}
  const missingKeywords = match?.missingKeywords || []
  const matchedKeywords = match?.matchedKeywords || []

  const applyUrl = job.applicationUrl || extractUrl(job.descriptionRaw || '')
  const logoFallback = job.companyName?.charAt(0)?.toUpperCase() || '?'
  const domain = job.companyName?.toLowerCase().replace(/\s+/g, '') || ''
  const logoUrl = `https://logo.clearbit.com/${domain}.com`

  const isTracked = job.isTracked

  const handleTrack = () => {
    if (isTracked) {
      untrackJob.mutate(job._id)
    } else {
      trackJob.mutate({ jobListingId: job._id })
    }
  }

  const handleApply = () => {
    if (applyUrl) window.open(applyUrl, '_blank', 'noopener,noreferrer')
  }

  const scoreColor =
    score >= 80 ? 'text-success' :
    score >= 60 ? 'text-amber' :
    score >= 40 ? 'text-danger' :
    'text-muted'

  const scoreBg =
    score >= 80 ? 'bg-success-light' :
    score >= 60 ? 'bg-amber-light' :
    score >= 40 ? 'bg-danger-light' :
    'bg-paper-dark'

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-paper-dark flex items-center justify-center text-base font-semibold text-ink shrink-0 overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={job.companyName}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                    ;(e.target as HTMLImageElement).parentElement!.textContent = logoFallback
                  }}
                />
              ) : (
                logoFallback
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-ink leading-snug">{job.roleTitle || 'Unknown Role'}</h2>
              <p className="text-sm text-muted mt-0.5">{job.companyName || 'Unknown Company'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
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
            <div className={cn('flex flex-col items-center gap-1 p-2 rounded-lg', scoreBg)}>
              <ScoreRing score={score} size={44} strokeWidth={4} scoreClassName="font-display font-bold text-[10px]" />
              <span className={cn('text-[9px] font-semibold uppercase tracking-wider', scoreColor)}>Match</span>
            </div>
          </div>
        </div>

        {/* Actions row */}
        <div className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-2">
          {applyUrl && (
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-teal text-white px-4 py-2 rounded-lg hover:bg-teal-dark transition-colors"
            >
              <IconExternalLink className="h-4 w-4" />
              Apply
            </button>
          )}

          <button
            onClick={handleTrack}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border transition-colors',
              isTracked
                ? 'bg-teal-light text-teal border-teal/30'
                : 'bg-surface text-ink border-border hover:bg-paper-dark'
            )}
          >
            {isTracked ? <IconBookmarkFilled className="h-4 w-4" /> : <IconBookmark className="h-4 w-4" />}
            {isTracked ? 'Saved' : 'Save'}
          </button>

          {onApprove && (
            <button
              onClick={() => onApprove(job._id)}
              disabled={approvePending}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-ink text-paper px-4 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <IconSend className="h-4 w-4" />
              {approvePending ? '...' : 'Auto-Apply'}
            </button>
          )}

          {odds?.recommendation && (
            <span className={cn(
              'text-xs font-semibold px-2 py-1 rounded',
              odds.recommendation === 'strong_apply' ? 'bg-success-light text-success' :
              odds.recommendation === 'apply' ? 'bg-teal-light text-teal' :
              odds.recommendation === 'long_shot' ? 'bg-amber-light text-amber' :
              'bg-danger-light text-danger'
            )}>
              {RECOMMENDATION_LABELS[odds.recommendation] || odds.recommendation}
            </span>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Salary */}
          {ef.salaryMin && (
            <div>
              <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Salary</h3>
              <p className="text-base font-semibold text-amber">
                {formatSalary(ef.salaryMin, ef.salaryMax, ef.salaryCurrency)}
              </p>
            </div>
          )}

          {/* Skills / Languages */}
          {ef.languages?.length > 0 && (
            <div>
              <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {ef.languages.map((lang: string) => (
                  <span key={lang} className="text-xs font-medium bg-teal-light text-teal px-2 py-0.5 rounded">{lang}</span>
                ))}
              </div>
            </div>
          )}

          {/* Match analysis */}
          {match && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider">Match analysis</h3>
                <span className="text-xs font-medium text-ink">{matchedKeywords.length} of {matchedKeywords.length + missingKeywords.length} skills matched</span>
              </div>
              {match.matchIntelligenceLine && (
                <p className="text-xs text-muted mb-3 leading-relaxed">{match.matchIntelligenceLine}</p>
              )}
              {(matchedKeywords.length + missingKeywords.length) > 0 && (
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

          {/* Match intelligence */}
          {match?.confidenceExplanation && (
            <div>
              <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Match details</h3>
              <p className="text-xs text-muted leading-relaxed">{match.confidenceExplanation}</p>
            </div>
          )}

          {/* Description */}
          {job.descriptionRaw && (
            <div>
              <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Description</h3>
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
        </div>
      </div>

      {/* Sticky bottom bar */}
      {applyUrl && (
        <div className="shrink-0 border-t border-border p-4">
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors"
          >
            <IconExternalLink className="h-4 w-4" />
            View original posting
          </a>
        </div>
      )}
    </div>
  )
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_apply: 'Strong Match',
  apply: 'Recommended',
  long_shot: 'Long Shot',
  skip: 'Skip',
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
