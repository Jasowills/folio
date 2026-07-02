import { useState, useRef } from 'react'
import { useDiscoverFeed, useDiscoverFeedStats, useDiscoverPreferences, useHideJob, useResumes, useUploadResume } from '../../lib/queries'
import JobCard from './JobCard'
import EmptyStates from './EmptyStates'
import FeedJobDetailsPanel from './FeedJobDetailsPanel'
import { cn } from '../../lib/utils'
import { IconAdjustmentsHorizontal } from '@tabler/icons-react'

const SOURCE_OPTIONS = [
  { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'lever', label: 'Lever' },
  { value: 'weworkremotely', label: 'Remote' },
  { value: 'remoteok', label: 'RemoteOK' },
  { value: 'hn', label: 'HN' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'ycombinator', label: 'YC' },
  { value: 'cryptojobslist', label: 'Crypto' },
  { value: 'bitcoinerjobs', label: 'Bitcoin' },
  { value: 'remotive', label: 'Remotive' },
  { value: 'arc', label: 'Arc' },
  { value: 'wellfound', label: 'Wellfound' },
  { value: 'builtin', label: 'Built In' },
]

export default function DiscoverFeed() {
  const { data: prefs } = useDiscoverPreferences()
  const { data: feedStats } = useDiscoverFeedStats()
  const { data: resumes } = useResumes()
  const hideJob = useHideJob()
  const uploadResume = useUploadResume()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [postedWithin, setPostedWithin] = useState<'24h' | '3d' | 'week' | undefined>('24h')
  const [minScore, setMinScore] = useState(prefs?.minimumMatchScore ?? 60)
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [hasSalary, setHasSalary] = useState(false)
  const [excludeApplied, setExcludeApplied] = useState(true)
  const [excludeRejected, setExcludeRejected] = useState(false)
  const [sort, setSort] = useState<'relevance' | 'newest' | 'salary'>('relevance')
  const [allJobs, setAllJobs] = useState<any[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [selectedJob, setSelectedJob] = useState<any>(null)

  const hasNoResume = resumes?.length === 0 || (!prefs?.resumeId && resumes?.length === 0)

  const handleUploadResume = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadResume.mutateAsync(file)
  }

  const filters = {
    sources: selectedSources.length > 0 ? selectedSources : undefined,
    postedWithin,
    minScore,
    remoteOnly: remoteOnly || undefined,
    hasSalary: hasSalary || undefined,
    excludeApplied,
    excludeRejected: excludeRejected || undefined,
    sort,
  }

  const { data, isLoading, isFetching, error } = useDiscoverFeed(filters, cursor)

  const jobs = data?.jobs || []
  const hasMore = data?.hasMore || false

  const displayJobs = cursor ? [...allJobs, ...jobs] : jobs

  const handleLoadMore = () => {
    if (data?.cursor) {
      setAllJobs(displayJobs)
      setCursor(data.cursor)
    }
  }

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    )
    setCursor(undefined)
    setAllJobs([])
  }

  const resetFilters = () => {
    setCursor(undefined)
    setAllJobs([])
  }

  const timeSinceLastCrawledAt = feedStats?.lastCrawledAt
    ? getTimeSince(new Date(feedStats.lastCrawledAt))
    : null

  const resumeName = prefs?.resumeId
    ? 'your selected resume'
    : hasNoResume
      ? null
      : 'your resume'

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-h2 text-ink text-wrap-balance">Discover</h1>
        {hasNoResume ? (
          <p className="text-sm text-muted mt-1">Upload a resume to see personalized match scores and recommendations</p>
        ) : (
          <p className="text-sm text-muted mt-1">
            {feedStats?.totalJobs ?? 0} matched roles found
            {timeSinceLastCrawledAt && <span> &middot; Updated {timeSinceLastCrawledAt}</span>}
            {resumeName && <span> &middot; Based on {resumeName}</span>}
          </p>
        )}
      </div>

      {!hasNoResume && (
        <>
          {/* Primary filters */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Match score */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Minimum match</span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => { setMinScore(Number(e.target.value)); resetFilters() }}
                  className="w-28 accent-teal h-1.5"
                />
                <span className="text-sm font-semibold text-ink tabular-nums w-8">{minScore}%</span>
              </div>
            </div>

            {/* Sort + Period as a group */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as any); resetFilters() }}
                  className="input-field w-auto text-xs py-1.5 pr-7"
                >
                  <option value="relevance">Most relevant</option>
                  <option value="newest">Newest</option>
                  <option value="salary">Highest salary</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Posted</span>
                <select
                  value={postedWithin || '24h'}
                  onChange={(e) => { setPostedWithin(e.target.value as any); resetFilters() }}
                  className="input-field w-auto text-xs py-1.5 pr-7"
                >
                  <option value="24h">Last 24h</option>
                  <option value="3d">Last 3 days</option>
                  <option value="week">Last week</option>
                </select>
              </div>
            </div>
          </div>

          {/* Toggles row */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
              <input type="checkbox" checked={remoteOnly} onChange={(e) => { setRemoteOnly(e.target.checked); resetFilters() }} className="accent-teal h-4 w-4 rounded border-border" />
              Remote only
            </label>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
              <input type="checkbox" checked={hasSalary} onChange={(e) => { setHasSalary(e.target.checked); resetFilters() }} className="accent-teal h-4 w-4 rounded border-border" />
              Has salary
            </label>
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
              <input type="checkbox" checked={excludeApplied} onChange={(e) => { setExcludeApplied(e.target.checked); resetFilters() }} className="accent-teal h-4 w-4 rounded border-border" />
              Exclude applied
            </label>
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
              <input type="checkbox" checked={excludeRejected} onChange={(e) => { setExcludeRejected(e.target.checked); resetFilters() }} className="accent-teal h-4 w-4 rounded border-border" />
              Exclude rejected
            </label>
          </div>

          {/* Source filters */}
          <div>
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider block mb-2">Sources</span>
            <div className="pill-group">
              <button
                onClick={() => { setSelectedSources([]); resetFilters() }}
                className={cn('pill', selectedSources.length === 0 ? 'pill-active' : 'pill-inactive')}
              >
                All
              </button>
              {SOURCE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggleSource(s.value)}
                  className={cn('pill', selectedSources.includes(s.value) ? 'pill-active' : 'pill-inactive')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-border" />
        </>
      )}

      {/* Job cards */}
      <div className="space-y-3">
        {hasNoResume ? (
          <EmptyStates type="no-resume" onUploadResume={handleUploadResume} />
        ) : isLoading && displayJobs.length === 0 ? (
          <EmptyStates type="loading" />
        ) : error && !isLoading ? (
          <EmptyStates type="error" lastCrawledAt={feedStats?.lastCrawledAt} />
        ) : !isLoading && !error && displayJobs.length === 0 ? (
          <EmptyStates type="no-results" onLowerScore={() => setMinScore(50)} onExtendRange={() => setPostedWithin('week')} />
        ) : (
          displayJobs.map((job: any) => (
          <JobCard
            key={job._id}
            job={job}
            onHide={() => hideJob.mutate(job._id)}
            onTracked={() => {}}
            onSelect={() => setSelectedJob(job)}
          />
        )))}

        {hasMore && (
          <div className="flex justify-center pt-2 pb-6">
            <button
              onClick={handleLoadMore}
              disabled={isFetching}
              className="px-8 py-2.5 text-sm font-medium text-teal bg-teal-light rounded-lg hover:bg-teal hover:text-white transition-all duration-150 disabled:opacity-50"
            >
              {isFetching ? 'Loading...' : 'Load more results'}
            </button>
          </div>
        )}

        {!isLoading && displayJobs.length > 0 && !hasMore && (
          <p className="text-center text-sm text-muted pt-2 pb-6">All matched roles loaded</p>
        )}
      </div>

      {selectedJob && (
        <FeedJobDetailsPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />
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
  return date.toLocaleDateString()
}
