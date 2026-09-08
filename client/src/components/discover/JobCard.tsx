import { useState, useRef, useEffect } from 'react'
import { useTrackJob, useDismissJob, useApplyOdds, type DismissReason } from '../../lib/queries'
import { cn, decodeHtml } from '../../lib/utils'
import { IconX, IconBookmark, IconBookmarkFilled } from '@tabler/icons-react'

interface JobCardProps {
  job: any
  selected?: boolean
  onSelect?: () => void
  onTracked?: () => void
}

export default function JobCard({ job, selected, onSelect, onTracked }: JobCardProps) {
  const trackJob = useTrackJob()
  const dismissJob = useDismissJob()
  const [hidden, setHidden] = useState(false)
  const [showDismissOptions, setShowDismissOptions] = useState(false)
  const dismissRef = useRef<HTMLDivElement>(null)

  const match = job.match
  const score = match?.atsScore ?? 0
  const postedDate = job.postedAt ? new Date(job.postedAt) : null
  const timeAgo = postedDate ? getTimeSince(postedDate) : ''
  const ef = job.extractedFields || {}
  const logoFallback = job.companyName?.charAt(0)?.toUpperCase() || '?'
  const domain = job.companyName?.toLowerCase().replace(/\s+/g, '') || ''
  const logoUrl = `https://logo.clearbit.com/${domain}.com`

  const { data: odds } = useApplyOdds(job._id)

  const scoreColor =
    score >= 80 ? 'text-success bg-success-light' :
    score >= 60 ? 'text-amber bg-amber-light' :
    score >= 40 ? 'text-danger bg-danger-light' :
    'text-muted bg-paper-dark'

  const isTracked = job.isTracked

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dismissRef.current && !dismissRef.current.contains(e.target as Node)) {
        setShowDismissOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTrack = (e: React.MouseEvent) => {
    e.stopPropagation()
    trackJob.mutate({ jobListingId: job._id }, { onSuccess: onTracked })
  }

  const handleDismiss = (e: React.MouseEvent, reason: DismissReason) => {
    e.stopPropagation()
    setHidden(true)
    setShowDismissOptions(false)
    dismissJob.mutate({ jobId: job._id, reason })
    setTimeout(() => setHidden(false), 5000)
  }

  if (hidden) return null

  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-3.5 flex gap-3 cursor-pointer transition-all duration-150 border-b border-border',
        'hover:bg-paper-dark/40',
        selected && 'bg-teal-light/20 border-l-2 border-l-teal',
        !selected && 'border-l-2 border-l-transparent',
      )}
    >
      {/* Logo */}
      <div className="h-12 w-12 rounded-lg bg-paper-dark flex items-center justify-center text-sm font-semibold text-ink shrink-0 overflow-hidden">
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

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Top row: title + score + actions */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-ink leading-snug line-clamp-1">{job.roleTitle}</p>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {score > 0 && (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none', scoreColor)}>
                {score}%
              </span>
            )}
            <button
              onClick={handleTrack}
              className={cn(
                'p-1 rounded transition-colors',
                isTracked ? 'text-teal' : 'text-muted hover:text-teal'
              )}
              title={isTracked ? 'Saved' : 'Save'}
            >
              {isTracked ? <IconBookmarkFilled className="h-3.5 w-3.5" /> : <IconBookmark className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Company */}
        <p className="text-xs text-muted mt-0.5 truncate">{job.companyName}</p>

        {/* Location + Date */}
        <p className="text-xs text-muted/70 mt-0.5 truncate">
          {job.isRemote ? 'Remote' : job.location || ''}
          {postedDate && <> · {timeAgo}</>}
        </p>

        {/* Salary */}
        {ef.salaryMin && (
          <p className="text-xs font-semibold text-amber mt-1">
            {formatSalary(ef.salaryMin, ef.salaryMax, ef.salaryCurrency)}
          </p>
        )}

        {/* Badges row */}
        {(job.isRemote || ef.experienceLevel) && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {job.isRemote && (
              <span className="text-[10px] text-muted bg-paper-dark px-1.5 py-0.5 rounded">Remote</span>
            )}
            {ef.experienceLevel && (
              <span className="text-[10px] text-muted bg-paper-dark px-1.5 py-0.5 rounded">{ef.experienceLevel}</span>
            )}
            {ef.languages?.slice(0, 2).map((lang: string) => (
              <span key={lang} className="text-[10px] text-teal bg-teal-light px-1.5 py-0.5 rounded">{lang}</span>
            ))}
          </div>
        )}

        {/* Bottom row: odds badge */}
        <div className="flex items-center gap-2 mt-2">
          {odds?.recommendation && odds.recommendation !== 'skip' && (
            <span className="text-[10px] font-medium text-muted bg-paper-dark px-1.5 py-0.5 rounded leading-none">
              {RECOMMENDATION_LABELS[odds.recommendation] || odds.recommendation}
            </span>
          )}
          {match?.matchIntelligenceLine && (
            <span className="text-[10px] text-muted/60 truncate max-w-[120px]">
              {decodeHtml(match.matchIntelligenceLine)}
            </span>
          )}
        </div>
      </div>

      {/* Dismiss */}
      <div ref={dismissRef} className="relative shrink-0 self-start">
        <button
          onClick={(e) => { e.stopPropagation(); setShowDismissOptions(!showDismissOptions) }}
          className="p-0.5 text-muted-light hover:text-muted transition-colors rounded"
          title="Dismiss"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
        {showDismissOptions && (
          <div
            className="absolute top-full right-0 mt-1 z-30 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            {DISMISS_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={(e) => handleDismiss(e, r.value)}
                className="block w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-paper-dark transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const DISMISS_REASONS: { value: DismissReason; label: string }[] = [
  { value: 'wrong_domain', label: 'Wrong domain' },
  { value: 'bad_seniority', label: 'Wrong level' },
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'salary_too_low', label: 'Salary too low' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'other', label: 'Other' },
]

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_apply: 'Strong Match',
  apply: 'Apply',
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
