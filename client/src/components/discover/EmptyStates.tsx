import { IconUpload, IconSearchOff, IconCloudOff } from '@tabler/icons-react'

interface EmptyStatesProps {
  type: 'loading' | 'no-results' | 'error' | 'no-resume'
  lastCrawledAt?: string | null
  onLowerScore?: () => void
  onExtendRange?: () => void
  onUploadResume?: () => void
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 w-32 bg-paper-dark rounded" />
          <div className="h-3 w-16 bg-paper-dark rounded" />
        </div>
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-paper-dark shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-paper-dark rounded" />
          </div>
          <div className="h-10 w-10 rounded-full bg-paper-dark shrink-0" />
        </div>
        <div className="flex gap-1.5 mb-3">
          <div className="h-5 w-16 bg-paper-dark rounded" />
          <div className="h-5 w-14 bg-paper-dark rounded" />
          <div className="h-5 w-12 bg-paper-dark rounded" />
        </div>
        <div className="h-3 w-full bg-paper-dark rounded mb-1" />
        <div className="h-3 w-2/3 bg-paper-dark rounded" />
      </div>
      <div className="flex items-center gap-2 px-4 pb-4 pt-0">
        <div className="h-7 w-20 bg-paper-dark rounded-lg" />
        <div className="h-7 w-16 bg-paper-dark rounded-lg" />
        <div className="h-7 w-14 bg-paper-dark rounded-lg ml-auto" />
      </div>
    </div>
  )
}

export default function EmptyStates({ type, lastCrawledAt, onLowerScore, onExtendRange, onUploadResume }: EmptyStatesProps) {
  if (type === 'loading') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted animate-pulse">Finding roles that match your resume...</p>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (type === 'no-resume') {
    return (
      <div className="flex flex-col items-center text-center py-20 px-4">
        <div className="h-16 w-16 rounded-2xl bg-teal-light flex items-center justify-center mb-5">
          <IconUpload className="h-7 w-7 text-teal" />
        </div>
        <h2 className="font-display text-h4 text-ink mb-2">Upload your resume to get started</h2>
        <p className="text-sm text-muted max-w-md mb-6 leading-relaxed">
          Discover matches jobs to your skills and experience. Upload a PDF or DOCX to see match scores, skill gaps, and personalized recommendations.
        </p>
        <button
          onClick={onUploadResume}
          className="px-5 py-2.5 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors"
        >
          Upload your resume
        </button>
      </div>
    )
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center text-center py-20 px-4">
        <div className="h-16 w-16 rounded-2xl bg-paper-dark flex items-center justify-center mb-5">
          <IconSearchOff className="h-7 w-7 text-muted" />
        </div>
        <h2 className="font-display text-h4 text-ink mb-2">No roles match your filters</h2>
        <p className="text-sm text-muted max-w-md mb-6 leading-relaxed">
          Try lowering your minimum match score or extending the date range to see more results.
        </p>
        <div className="flex items-center gap-3">
          {onLowerScore && (
            <button
              onClick={onLowerScore}
              className="px-4 py-2 text-sm font-medium bg-teal-light text-teal rounded-lg hover:bg-teal hover:text-white transition-colors"
            >
              Lower to 50%
            </button>
          )}
          {onExtendRange && (
            <button
              onClick={onExtendRange}
              className="px-4 py-2 text-sm font-medium text-ink border border-border rounded-lg hover:bg-paper-dark transition-colors"
            >
              Show last week
            </button>
          )}
        </div>
      </div>
    )
  }

  if (type === 'error') {
    return (
      <div className="flex flex-col items-center text-center py-20 px-4">
        <div className="h-16 w-16 rounded-2xl bg-danger-light flex items-center justify-center mb-5">
          <IconCloudOff className="h-7 w-7 text-danger" />
        </div>
        <h2 className="font-display text-h4 text-ink mb-2">Couldn't reach job sources</h2>
        <p className="text-sm text-muted max-w-md leading-relaxed">
          {lastCrawledAt
            ? `Your feed was last updated ${new Date(lastCrawledAt).toLocaleString()}.`
            : 'Your feed hasn\'t been updated yet.'}
        </p>
        <p className="text-sm text-muted mt-1">We'll retry automatically in 30 minutes.</p>
      </div>
    )
  }

  return null
}
