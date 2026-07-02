import { ScoreRing } from '../ScoreRing'

interface TrackerCardProps {
  app: any
  onClick: () => void
}

export default function TrackerCard({ app, onClick }: TrackerCardProps) {
  const job = app.jobListing || {}
  const match = app.match
  const score = match?.atsScore ?? 0
  const checklist = app.checklistState || {}
  const doneCount = Object.values(checklist).filter(Boolean).length
  const totalItems = Object.keys(checklist).length

  const companyInitial = job.companyName?.charAt(0)?.toUpperCase() || '?'
  const companyDomain = job.companyName?.toLowerCase().replace(/\s+/g, '') || ''
  const logoUrl = `https://logo.clearbit.com/${companyDomain}.com`

  const daysSinceActivity = app.lastActivityAt
    ? Math.floor((Date.now() - new Date(app.lastActivityAt).getTime()) / 86400000)
    : 0

  const postedDate = job.postedAt ? new Date(job.postedAt) : null
  const timeAgo = postedDate ? getTimeSince(postedDate) : ''

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-lg p-3 hover:border-teal/30 transition-colors cursor-pointer space-y-2"
    >
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded-md bg-paper-dark flex items-center justify-center text-xs font-semibold text-ink shrink-0 overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={job.companyName}
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                ;(e.target as HTMLImageElement).parentElement!.textContent = companyInitial
              }}
            />
          ) : (
            companyInitial
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-ink truncate">{job.roleTitle || 'Unknown Role'}</p>
          <p className="text-[10px] text-muted truncate">{job.companyName || 'Unknown'}</p>
        </div>
        <ScoreRing score={score} size={32} strokeWidth={3} scoreClassName="text-[8px]" />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted">
        <span>{timeAgo}</span>
        <span>·</span>
        <span>{app.stage?.replace(/_/g, ' ') || 'saved'}</span>
        {daysSinceActivity > 0 && (
          <>
            <span>·</span>
            <span>{daysSinceActivity}d ago</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-border-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-teal transition-all"
            style={{ width: `${totalItems > 0 ? (doneCount / totalItems) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[10px] text-muted whitespace-nowrap">{doneCount} of {totalItems}</span>
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
