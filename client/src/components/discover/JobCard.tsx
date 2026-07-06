import { useState } from 'react'
import { ScoreRing } from '../ScoreRing'
import { useTrackJob } from '../../lib/queries'
import MiniPrepPanel from './MiniPrepPanel'
import { cn, decodeHtml, formatJobDescription, extractUrl } from '../../lib/utils'
import { IconX, IconCircleCheck, IconExternalLink, IconMapPin, IconClock } from '@tabler/icons-react'

const SOURCE_ABBREV: Record<string, string> = {
  greenhouse: 'GH',
  lever: 'LV',
  workday: 'WD',
  weworkremotely: 'WR',
  remoteok: 'RO',
  otta: 'OT',
  hn: 'HN',
  ycombinator: 'YC',
  twitter: 'TW',
  linkedin: 'LI',
  cryptojobslist: 'CR',
  bitcoinerjobs: 'BJ',
  remotive: 'RM',
  arc: 'AR',
  wellfound: 'WF',
  builtin: 'BI',
  techtree: 'TT',
}

interface JobCardProps {
  job: any
  onHide: () => void
  onTracked: () => void
  onSelect?: () => void
}

export default function JobCard({ job, onHide, onTracked, onSelect }: JobCardProps) {
  const trackJob = useTrackJob()
  const [showPrep, setShowPrep] = useState(false)
  const [hidden, setHidden] = useState(false)

  const match = job.match
  const score = match?.atsScore ?? 0

  const postedDate = job.postedAt ? new Date(job.postedAt) : null
  const timeAgo = postedDate ? getTimeSince(postedDate) : ''
  const isExpired = postedDate && (Date.now() - postedDate.getTime()) > 7 * 86400000
  const ef = job.extractedFields || {}

  const applyUrl = job.applicationUrl || extractUrl(job.descriptionRaw || '')
  const logoFallback = job.companyName?.charAt(0)?.toUpperCase() || '?'
  const domain = job.companyName?.toLowerCase().replace(/\s+/g, '') || ''
  const logoUrl = `https://logo.clearbit.com/${domain}.com`

  const handleTrack = () => {
    trackJob.mutate({ jobListingId: job._id }, { onSuccess: onTracked })
  }

  const handleHide = () => {
    setHidden(true)
    onHide()
    setTimeout(() => setHidden(false), 5000)
  }

  const handleApply = () => {
    if (applyUrl) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (hidden) return null

  return (
    <>
      <div
        className={cn(
          'relative bg-surface border border-border rounded-xl transition-all duration-200',
          isExpired && !job.isTracked && 'opacity-50',
          'hover:border-teal/30 hover:shadow-sm',
        )}
      >
        {/* Tracked indicator */}
        {job.isTracked && (
          <span className="absolute top-3 right-3 text-[10px] font-medium bg-teal-light text-teal px-2 py-0.5 rounded-full z-10">
            Tracked
          </span>
        )}

        <div className="p-4 cursor-pointer" onClick={onSelect}>
          {/* Company + Source + Time */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted">{job.companyName}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium bg-paper-dark text-muted px-1.5 py-0.5 rounded">
                {SOURCE_ABBREV[job.source] || job.source}
              </span>
              <span className="text-[10px] text-muted flex items-center gap-0.5">
                <IconClock className="h-2.5 w-2.5" />
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Logo + Title + Score */}
          <div className="flex items-start gap-3 mb-2.5">
            <div className="h-10 w-10 rounded-lg bg-paper-dark flex items-center justify-center text-sm font-semibold text-ink shrink-0 overflow-hidden">
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
              <p className="text-sm font-semibold text-ink leading-snug truncate">{job.roleTitle}</p>
            </div>
            {score > 0 ? (
              <ScoreRing score={score} size={40} strokeWidth={4} scoreClassName="font-display font-bold text-[10px]" />
            ) : (
              <div className="h-10 w-10 rounded-full border-2 border-border flex items-center justify-center text-[10px] text-muted-light font-medium shrink-0">
                ?
              </div>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {(job.isRemote || job.location) && (
              <span className="text-[11px] text-muted flex items-center gap-0.5 bg-paper-dark px-1.5 py-0.5 rounded">
                <IconMapPin className="h-2.5 w-2.5" />
                {job.isRemote ? 'Remote' : job.location}
              </span>
            )}
            {ef.experienceLevel && (
              <span className="text-[11px] text-muted bg-paper-dark px-1.5 py-0.5 rounded">
                {ef.experienceLevel}
              </span>
            )}
            {ef.languages?.length > 0 && ef.languages.slice(0, 2).map((lang: string) => (
              <span key={lang} className="text-[11px] text-teal bg-teal-light px-1.5 py-0.5 rounded">
                {lang}
              </span>
            ))}
            {ef.languages?.length > 2 && (
              <span className="text-[11px] text-teal bg-teal-light px-1.5 py-0.5 rounded">
                +{ef.languages.length - 2}
              </span>
            )}
          </div>

          {/* Salary */}
          {ef.salaryMin && (
            <p className="text-sm font-semibold text-amber mb-2">
              {formatSalary(ef.salaryMin, ef.salaryMax, ef.salaryCurrency)}
            </p>
          )}

          {/* Match intelligence or description preview */}
          {match?.matchIntelligenceLine ? (
            <p className="text-xs text-muted mb-2 leading-relaxed line-clamp-2">
              {decodeHtml(match.matchIntelligenceLine)}
            </p>
          ) : job.descriptionRaw ? (
            <p className="text-xs text-muted leading-relaxed line-clamp-2">
              {decodeHtml(formatJobDescription(job.descriptionRaw)).slice(0, 250)}
            </p>
          ) : null}

          {/* Expired notice */}
          {isExpired && !job.isTracked && (
            <p className="text-[11px] text-muted mb-2">This listing may no longer be active</p>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {!job.isTracked ? (
            <button
              onClick={(e) => { e.stopPropagation(); handleTrack() }}
              disabled={trackJob.isPending}
              className="px-3 py-1.5 text-xs font-medium bg-teal-light text-teal rounded-lg hover:bg-teal hover:text-white transition-colors"
            >
              {trackJob.isPending ? '...' : 'Track this'}
            </button>
          ) : (
            <button className="px-3 py-1.5 text-xs font-medium bg-success-light text-success rounded-lg flex items-center gap-1">
              <IconCircleCheck className="h-3 w-3" />
              Tracked
            </button>
          )}

          {applyUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); handleApply() }}
              className="px-3 py-1.5 text-xs font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors flex items-center gap-1"
            >
              <IconExternalLink className="h-3 w-3" />
              Apply
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowPrep(true) }}
            className="px-3 py-1.5 text-xs font-medium text-ink border border-border rounded-lg hover:bg-paper-dark transition-colors"
          >
            Prep
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handleHide() }}
            className="ml-auto p-1.5 text-muted hover:text-ink transition-colors rounded-lg hover:bg-paper-dark"
            title="Hide"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showPrep && (
        <MiniPrepPanel
          job={job}
          match={match}
          onClose={() => setShowPrep(false)}
        />
      )}
    </>
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
