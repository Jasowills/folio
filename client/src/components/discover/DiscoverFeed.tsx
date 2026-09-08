import { useState, useRef, useEffect, useCallback } from 'react'
import { useDiscoverFeed, useDiscoverFeedStats, useDiscoverPreferences, useResumes, useUploadResume, useApproveJobs } from '../../lib/queries'
import JobCard from './JobCard'
import EmptyStates from './EmptyStates'
import FeedJobDetailsPanel from './FeedJobDetailsPanel'
import { cn, decodeHtml } from '../../lib/utils'

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
  { value: 'techtree', label: 'TechTree' },
  { value: 'ashby', label: 'Ashby' },
  { value: 'icims', label: 'iCIMS' },
  { value: 'smartrecruiters', label: 'SmartRecruiters' },
]

export default function DiscoverFeed() {
  const { data: prefs } = useDiscoverPreferences()
  const { data: feedStats } = useDiscoverFeedStats()
  const { data: resumes } = useResumes()
  const uploadResume = useUploadResume()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [postedWithin, setPostedWithin] = useState<'24h' | '3d' | 'week' | undefined>(undefined)
  const [minScore, setMinScore] = useState(prefs?.minimumMatchScore ?? 60)
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [hasSalary, setHasSalary] = useState(false)
  const [excludeApplied, setExcludeApplied] = useState(true)
  const [excludeRejected, setExcludeRejected] = useState(false)
  const [sort, setSort] = useState<'relevance' | 'newest' | 'salary'>('relevance')
  const [allJobs, setAllJobs] = useState<any[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [selectedJob, setSelectedJob] = useState<any>(null)

  const selectedResume = resumes?.find((r) => r._id === prefs?.resumeId) || resumes?.[0]
  const detectedRole = selectedResume?.detectedRole?.role ? decodeHtml(selectedResume.detectedRole.role).trim() : null
  const hasNoResume = resumes?.length === 0 || (!prefs?.resumeId && resumes?.length === 0)
  const approveJobs = useApproveJobs()

  const handleUploadResume = () => {
    fileInputRef.current?.click()
  }

  const handleApproveJob = (jobId: string) => {
    if (!selectedResume) return
    approveJobs.mutate({ jobIds: [jobId], resumeId: selectedResume._id })
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

  console.log('[DiscoverFeed] state:', {
    filters,
    cursor,
    data,
    isLoading,
    isFetching,
    error: error ? (error as Error).message : null,
    hasResume: !!selectedResume,
    hasPrefs: !!prefs,
  })

  const jobs = data?.jobs || []
  const hasMore = data?.hasMore || false

  const displayJobs = cursor ? [...allJobs, ...jobs] : jobs

  const loadMoreRef = useRef<(() => void) | null>(null)
  const handleLoadMore = useCallback(() => {
    if (data?.cursor && !isFetching) {
      setAllJobs(displayJobs)
      setCursor(data.cursor)
    }
  }, [data?.cursor, isFetching, displayJobs])

  loadMoreRef.current = handleLoadMore

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isFetching) {
          loadMoreRef.current?.()
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, isFetching])

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    )
    setCursor(undefined)
    setAllJobs([])
    setSelectedJob(null)
  }

  const resetFilters = () => {
    setCursor(undefined)
    setAllJobs([])
    setSelectedJob(null)
  }

  const handleSelectJob = (job: any) => {
    setSelectedJob(job)
  }

  const timeSinceLastCrawledAt = feedStats?.lastCrawledAt
    ? getTimeSince(new Date(feedStats.lastCrawledAt))
    : null

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Left pane: job list */}
      <div className="w-[440px] shrink-0 flex flex-col bg-surface border-r border-border min-h-0">
        {/* Sticky header with stats */}
        <div className="shrink-0 border-b border-border">
          <div className="px-4 pt-3 pb-2">
            <h1 className="font-display text-h5 text-ink">Discover</h1>
            {hasNoResume ? (
              <p className="text-xs text-muted mt-0.5">Upload a resume to see match scores</p>
            ) : (
              <p className="text-xs text-muted mt-0.5">
                {feedStats?.totalJobs ?? 0} roles matched
                {detectedRole && <span> for &ldquo;{detectedRole}&rdquo;</span>}
                {timeSinceLastCrawledAt && <span> · Updated {timeSinceLastCrawledAt}</span>}
              </p>
            )}
          </div>

          {!hasNoResume && (
            <>
              {/* Primary filters */}
              <div className="px-4 pb-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Match</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={minScore}
                      onChange={(e) => { setMinScore(Number(e.target.value)); resetFilters() }}
                      className="w-16 accent-teal h-1"
                    />
                    <span className="text-[11px] font-semibold text-ink tabular-nums w-6">{minScore}%</span>
                  </div>

                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value as any); resetFilters() }}
                    className="text-xs bg-transparent border border-border rounded px-1.5 py-1 text-ink outline-none"
                  >
                    <option value="relevance">Most relevant</option>
                    <option value="newest">Newest</option>
                    <option value="salary">Highest salary</option>
                  </select>

                  <select
                    value={postedWithin || '24h'}
                    onChange={(e) => { setPostedWithin(e.target.value as any); resetFilters() }}
                    className="text-xs bg-transparent border border-border rounded px-1.5 py-1 text-ink outline-none"
                  >
                    <option value="24h">Past 24h</option>
                    <option value="3d">Past 3 days</option>
                    <option value="week">Past week</option>
                  </select>
                </div>

                {/* Toggles row */}
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 text-muted cursor-pointer select-none">
                    <input type="checkbox" checked={remoteOnly} onChange={(e) => { setRemoteOnly(e.target.checked); resetFilters() }} className="accent-teal h-3 w-3 rounded border-border" />
                    Remote
                  </label>
                  <label className="flex items-center gap-1.5 text-muted cursor-pointer select-none">
                    <input type="checkbox" checked={hasSalary} onChange={(e) => { setHasSalary(e.target.checked); resetFilters() }} className="accent-teal h-3 w-3 rounded border-border" />
                    Salary
                  </label>
                  <label className="flex items-center gap-1.5 text-muted cursor-pointer select-none">
                    <input type="checkbox" checked={excludeApplied} onChange={(e) => { setExcludeApplied(e.target.checked); resetFilters() }} className="accent-teal h-3 w-3 rounded border-border" />
                    Hide applied
                  </label>
                  <label className="flex items-center gap-1.5 text-muted cursor-pointer select-none">
                    <input type="checkbox" checked={excludeRejected} onChange={(e) => { setExcludeRejected(e.target.checked); resetFilters() }} className="accent-teal h-3 w-3 rounded border-border" />
                    Hide rejected
                  </label>
                </div>
              </div>

              {/* Source pills */}
              <div className="px-4 pb-2.5">
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => { setSelectedSources([]); resetFilters() }}
                    className={cn(
                      'shrink-0 text-[11px] font-medium px-2 py-1 rounded transition-colors whitespace-nowrap',
                      selectedSources.length === 0 ? 'bg-teal text-white' : 'bg-paper-dark text-muted hover:text-ink',
                    )}
                  >
                    All
                  </button>
                  {SOURCE_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => toggleSource(s.value)}
                      className={cn(
                        'shrink-0 text-[11px] font-medium px-2 py-1 rounded transition-colors whitespace-nowrap',
                        selectedSources.includes(s.value) ? 'bg-teal text-white' : 'bg-paper-dark text-muted hover:text-ink',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scrollable job list */}
        <div className="flex-1 overflow-y-auto">
          {hasNoResume ? (
            <div className="p-4">
              <EmptyStates type="no-resume" onUploadResume={handleUploadResume} />
            </div>
          ) : isLoading && displayJobs.length === 0 ? (
            <div className="p-4">
              <EmptyStates type="loading" />
            </div>
          ) : error && !isLoading ? (
            <div className="p-4">
              <EmptyStates type="error" lastCrawledAt={feedStats?.lastCrawledAt} />
            </div>
          ) : !isLoading && !error && displayJobs.length === 0 ? (
            <div className="p-4">
              <EmptyStates
                type="no-results"
                onLowerScore={() => setMinScore(50)}
                onExtendRange={() => setPostedWithin('week')}
              />
            </div>
          ) : (
            <>
              {displayJobs.map((job: any) => (
                <JobCard
                  key={job._id}
                  job={job}
                  selected={selectedJob?._id === job._id}
                  onSelect={() => handleSelectJob(job)}
                  onTracked={() => {}}
                />
              ))}
              {/* Infinite scroll sentinel */}
              {hasMore && <div ref={sentinelRef} className="h-4" />}
              {!isLoading && !hasMore && displayJobs.length > 0 && (
                <p className="text-center text-xs text-muted py-4">All matched roles loaded</p>
              )}
              {isFetching && (
                <div className="flex justify-center py-3">
                  <div className="h-4 w-4 rounded-full border-2 border-teal/30 border-t-teal animate-spin" />
                </div>
              )}
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Right pane: detail panel */}
      <div className="flex-1 flex flex-col bg-surface overflow-hidden min-h-0">
        <FeedJobDetailsPanel
          job={selectedJob}
          onApprove={selectedResume ? handleApproveJob : undefined}
          approvePending={approveJobs.isPending}
        />
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
  return date.toLocaleDateString()
}
