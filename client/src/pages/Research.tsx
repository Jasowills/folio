import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useResumes, useStartResearch, useResearchStatus, useResearchHistory } from '../lib/queries'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import {
  IconTargetArrow, IconMail, IconBrandPagekit,
  IconRefresh, IconCircleCheck, IconAlertTriangle, IconExternalLink,
  IconChevronDown, IconChevronRight, IconLoader, IconHistory, IconWorld,
} from '@tabler/icons-react'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Research() {
  const navigate = useNavigate()
  const { data: resumes } = useResumes()
  const startResearch = useStartResearch()
  const { data: history } = useResearchHistory()

  const [companyName, setCompanyName] = useState('')
  const [companyUrl, setCompanyUrl] = useState('')
  const [showRoleContext, setShowRoleContext] = useState(false)
  const [roleTitle, setRoleTitle] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [upgradeUrl, setUpgradeUrl] = useState('')
  const [processingStuck, setProcessingStuck] = useState(false)

  const { data: job } = useResearchStatus(analysisId)

  const isComplete = job?.status === 'completed'
  const isFailed = job?.status === 'failed'
  const isProcessing = !isComplete && !isFailed && !!analysisId

  // Timeout: if processing takes > 5 minutes, show stuck UI
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (isProcessing) {
      setProcessingStuck(false)
      processingTimeoutRef.current = setTimeout(() => setProcessingStuck(true), 5 * 60 * 1000)
    } else {
      clearTimeout(processingTimeoutRef.current)
    }
    return () => clearTimeout(processingTimeoutRef.current)
  }, [isProcessing])

  const handleResearch = async () => {
    if (!companyName) return
    setError('')
    const body: { companyName: string; companyUrl?: string; roleContext?: { roleTitle: string; resumeId?: string } } = {
      companyName,
    }
    if (companyUrl) body.companyUrl = companyUrl
    if (roleTitle) body.roleContext = { roleTitle, resumeId: resumeId || undefined }

    try {
      const res = await startResearch.mutateAsync(body)
      setAnalysisId(res.analysisId)
    } catch (err) {
      setError((err as Error)?.message || 'Research failed to start')
    }
  }

  const handleReset = () => {
    setAnalysisId(null)
    setCompanyName('')
    setCompanyUrl('')
    setRoleTitle('')
    setResumeId('')
    setShowRoleContext(false)
    setError('')
    setUpgradeUrl('')
  }

  const handleLoadHistory = (j: { analysisId: string; companyName: string; companyUrl?: string; roleContext?: { roleTitle: string; resumeId?: string } }) => {
    setAnalysisId(j.analysisId)
    setCompanyName(j.companyName)
    if (j.companyUrl) setCompanyUrl(j.companyUrl)
    if (j.roleContext) {
      setRoleTitle(j.roleContext.roleTitle)
      setResumeId(j.roleContext.resumeId || '')
      setShowRoleContext(true)
    }
  }

  const handleUpgrade = async () => {
    if (!upgradeUrl || !analysisId || !job) return
    setError('')
    try {
      const res = await startResearch.mutateAsync({
        companyName: job.companyName,
        companyUrl: upgradeUrl,
        roleContext: job.roleContext || (roleTitle ? { roleTitle, resumeId: resumeId || undefined } : undefined),
      })
      setAnalysisId(res.analysisId)
    } catch (err) {
      setError((err as Error)?.message || 'Upgrade failed')
    }
  }

  const recentJobs = (history?.jobs || []).slice(0, 3)

  const crawlFeedRef = useRef<HTMLDivElement>(null)
  const pages = job?.crawlData?.pagesVisited || []
  const pageCount = job?.crawlData?.pageCount || 0
  const currentlyCrawling = job?.crawlData?.currentlyCrawling || []

  // Auto-scroll crawl feed when new pages arrive
  useEffect(() => {
    if (crawlFeedRef.current && pages.length > 0) {
      crawlFeedRef.current.scrollTo({ top: crawlFeedRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [pages.length])

  return (
    <div className="page-container">
      <AnimatePresence mode="wait">
        {!analysisId ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="max-w-xl mx-auto space-y-6 pt-12"
          >
            <div className="text-center space-y-3 mb-8">
              <h2 className="font-display text-h3 text-ink">
                Research a company before you walk in
              </h2>
              <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
                Paste a company name or website and we'll pull together what actually matters
                — their mission, what they're building, how they likely interview, and what to bring up.
              </p>
            </div>

            <div className="card space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <IconAlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Company name
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Figma"
                />
              </div>

              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Company website <span className="text-muted-light font-normal">(optional)</span>
                </label>
                <input
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://company.com"
                />
                <p className="text-xs text-muted mt-1.5">
                  A URL gives us their actual mission, values, and recent news — strongly recommended.
                </p>
              </div>

              <div>
                <button
                  onClick={() => setShowRoleContext(!showRoleContext)}
                  className="inline-flex items-center gap-1 text-xs text-teal font-medium hover:text-teal-dark transition-colors cursor-pointer"
                >
                  {showRoleContext ? <IconChevronDown className="h-3 w-3" /> : <IconChevronRight className="h-3 w-3" />}
                  Add role context
                </button>
                <AnimatePresence>
                  {showRoleContext && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3 space-y-3"
                    >
                      <div>
                        <label className="label-uppercase text-muted block mb-1.5">
                          Role title
                        </label>
                        <input
                          value={roleTitle}
                          onChange={(e) => setRoleTitle(e.target.value)}
                          className="input-field"
                          placeholder="e.g. Senior Product Designer"
                        />
                      </div>
                      <div>
                        <label className="label-uppercase text-muted block mb-1.5">
                          Your resume <span className="text-muted-light font-normal">(optional)</span>
                        </label>
                        <Select
                          value={resumeId}
                          onChange={setResumeId}
                          options={[
                            { value: '', label: 'None' },
                            ...(resumes?.map((r) => ({ value: r._id, label: r.name || r.title || 'Untitled' })) || []),
                          ]}
                          placeholder="None"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleResearch}
                disabled={!companyName || startResearch.isPending}
                className="w-full"
              >
                {startResearch.isPending ? (
                  <IconLoader className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <IconBrandPagekit className="h-4 w-4 mr-1.5" />
                    Research this company
                  </>
                )}
              </Button>
            </div>

            {recentJobs.length > 0 && (
              <div className="card">
                <div className="section-title mb-3">
                  <IconHistory className="h-3.5 w-3.5 text-muted" />
                  Recent research
                </div>
                <div className="space-y-1">
                  {recentJobs.map((j) => (
                    <button
                      key={j._id}
                      onClick={() => handleLoadHistory({ analysisId: j._id, companyName: j.companyName, companyUrl: j.companyUrl, roleContext: j.roleContext })}
                      className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-paper transition-colors -mx-1"
                    >
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-xs text-ink truncate font-medium">{j.companyName}</p>
                        <p className="text-[10px] text-muted">{formatRelativeTime(j.createdAt)}</p>
                      </div>
                      <IconChevronRight className="h-3 w-3 text-muted shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : isProcessing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-xl mx-auto pt-12"
          >
            <div className="bg-ink rounded-xl p-8 space-y-6">
              <div className="text-center space-y-3">
                <IconWorld className="h-8 w-8 text-teal animate-pulse mx-auto" />
                <h3 className="font-display text-h4 text-white">
                  {job?.status === 'crawling' ? `Researching ${job.companyName}...` :
                   job?.status === 'analysing' ? 'Building your brief...' :
                   `Researching ${job?.companyName || companyName}...`}
                </h3>
                {job?.status === 'crawling' && (
                  <p className="text-sm text-white/40">{pageCount} source{pageCount !== 1 ? 's' : ''} found</p>
                )}
              </div>

              {job?.status === 'crawling' && (
                <>
                  {/* Live feed */}
                  <div ref={crawlFeedRef} className="max-h-64 overflow-y-auto space-y-1.5 -mx-2 px-2 scrollbar-thin">
                    {pages.length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-white/30">
                        <span className="h-2 w-2 rounded-full bg-teal animate-pulse shrink-0" />
                        Gathering information...
                      </div>
                    )}
                    {pages.map((p, i) => {
                      const hostname = p.url ? new URL(p.url).hostname.replace(/^www\./, '') : ''
                      return (
                        <motion.div
                          key={p.url + i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-2.5"
                        >
                          <span className="h-2 w-2 rounded-full mt-1.5 shrink-0 bg-teal/50" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs truncate text-white/60">
                              {p.title || hostname}
                            </p>
                            <p className="text-[10px] text-white/30 truncate">{hostname}</p>
                          </div>
                        </motion.div>
                      )
                    })}

                    {/* In-progress URLs */}
                    {currentlyCrawling.map((c) => {
                      const hostname = c.url ? new URL(c.url).hostname.replace(/^www\./, '') : ''
                      return (
                        <motion.div
                          key={c.url}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-2.5"
                        >
                          <span className="h-2 w-2 rounded-full mt-1.5 shrink-0 bg-teal animate-pulse" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs truncate text-teal/80">
                              Scanning<span className="animate-pulse">...</span>
                            </p>
                            <p className="text-[10px] text-white/30 truncate">{hostname}</p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Stats bar */}
                  <div className="flex items-center justify-center gap-4 text-xs text-white/40">
                    <span>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
                    {currentlyCrawling.length > 0 && (
                      <span className="text-teal/60">{currentlyCrawling.length} scanning in parallel</span>
                    )}
                  </div>
                </>
              )}

              {job?.status === 'analysing' && (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    {pages.length > 0 && (
                      <span className="text-xs text-teal/70">
                        Scanned {pageCount} source{pageCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-white/40">
                    <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />
                    Generating your research brief...
                  </div>
                </div>
              )}

              {processingStuck && (
                <div className="text-center space-y-3 pt-2 border-t border-white/10">
                  <p className="text-xs text-amber-400/80">
                    This is taking longer than expected. You can restart or try again.
                  </p>
                  <button
                    onClick={handleReset}
                    className="text-xs text-teal hover:text-teal-light transition-colors cursor-pointer"
                  >
                    Start over
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : isFailed ? (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-xl mx-auto pt-12"
          >
            <div className="card text-center space-y-4">
              <IconAlertTriangle className="h-10 w-10 text-danger mx-auto" />
              <div>
                <h3 className="font-display text-h4 text-ink mb-1">Research failed</h3>
                <p className="text-sm text-muted">
                  {job?.error || 'Could not complete the research. Try again.'}
                </p>
              </div>
              <Button variant="primary" size="md" onClick={handleReset}>
                Try again
              </Button>
            </div>
          </motion.div>
        ) : isComplete && job?.brief ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-[720px] mx-auto space-y-12 pb-12"
          >
            {/* General knowledge banner */}
            {job.usedGeneralKnowledge && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <IconAlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-800 font-medium">This brief is based on general knowledge only.</p>
                  <p className="text-xs text-amber-700 mt-1">Add their website for a much sharper brief.</p>
                  <div className="flex gap-2 mt-3">
                    <input
                      value={upgradeUrl}
                      onChange={(e) => setUpgradeUrl(e.target.value)}
                      className="input-field flex-1 text-sm"
                      placeholder="https://company.com"
                    />
                    <Button variant="primary" size="sm" onClick={handleUpgrade} disabled={!upgradeUrl}>
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Block 1 — Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-[30px] font-bold text-ink leading-tight">
                  {job.companyName}
                </h1>
                <p className="text-sm text-muted mt-1.5 flex items-center gap-3 flex-wrap">
                  {job.brief.industry && (
                    <span className="badge badge-teal text-[10px]">{job.brief.industry}</span>
                  )}
                  {job.brief.companySizeSignal && (
                    <span className="text-xs text-muted">{job.brief.companySizeSignal}</span>
                  )}
                  {job.brief.salaryRange?.estimate && (
                    <span className="text-xs text-amber font-medium">{job.brief.salaryRange.estimate}</span>
                  )}
                  {job.companyUrl && (
                    <a
                      href={job.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted hover:text-teal transition-colors inline-flex items-center gap-1"
                    >
                      {new URL(job.companyUrl).hostname}
                      <IconExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-success inline-flex items-center gap-1">
                  <IconCircleCheck className="h-3 w-3" /> Saved
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  <IconRefresh className="h-3.5 w-3.5 mr-1" />
                  Re-research
                </Button>
              </div>
            </div>

            {/* Block 2 — At a Glance */}
            <div className="bg-ink rounded-xl p-8 space-y-5">
              <h2 className="font-display text-[22px] font-bold text-white leading-snug">
                {job.brief.atAGlance}
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {job.brief.foundedYear && (
                  <span className="text-[13px] text-teal font-medium">Founded {job.brief.foundedYear}</span>
                )}
                {job.brief.fundingStage && (
                  <span className="text-[13px] text-teal font-medium">{job.brief.fundingStage}</span>
                )}
                {job.brief.teamSizeEstimate && (
                  <span className="text-[13px] text-teal font-medium">{job.brief.teamSizeEstimate}</span>
                )}
                {job.brief.headquarters && (
                  <span className="text-[13px] text-teal font-medium">{job.brief.headquarters}</span>
                )}
              </div>
            </div>

            {/* Block 3 — Mission & Values */}
            {(job.brief.mission || job.brief.values) && (
              <div className="card">
                <h3 className="text-[15px] font-semibold text-ink mb-3">What they care about</h3>
                {job.brief.mission && (
                  <p className="text-sm text-ink/80 leading-relaxed mb-4">{job.brief.mission}</p>
                )}
                {job.brief.values && job.brief.values.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.brief.values.map((v) => (
                      <span key={v} className="badge badge-teal">{v}</span>
                    ))}
                  </div>
                )}
                {job.companyUrl && (
                  <p className="text-[11px] text-muted mt-4">
                    Based on {job.companyName}'s about and careers pages
                  </p>
                )}
              </div>
            )}

            {/* Block 4 — What They Build */}
            <div className="card">
              <h3 className="text-[15px] font-semibold text-ink mb-3">What they actually build</h3>
              <p className="text-sm text-ink/80 leading-relaxed">{job.brief.whatTheyBuild}</p>
              {job.brief.roleConnection && (
                <div className="mt-4 p-4 rounded-lg bg-teal-light/50 border border-teal/20">
                  <p className="text-xs font-semibold text-teal-dark mb-1">
                    How this connects to the {job.roleContext?.roleTitle || 'applied'} role
                  </p>
                  <p className="text-sm text-ink/80 leading-relaxed">{job.brief.roleConnection}</p>
                </div>
              )}
            </div>

            {/* Block 5 — Recent News */}
            {job.brief.recentNews.length > 0 && (
              <div className="card">
                <h3 className="text-[15px] font-semibold text-ink mb-1">What's happening right now</h3>
                <p className="text-xs text-muted mb-4">Bring one of these up — it shows you looked beyond the homepage.</p>
                <div className="space-y-3">
                  {job.brief.recentNews.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal mt-2 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-ink leading-snug">{item.headline}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted">{item.date}</span>
                          {item.sourceUrl && (
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-teal hover:underline inline-flex items-center gap-0.5">
                              Source <IconExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block 6 — How They Likely Interview */}
            <div className="card">
              <h3 className="text-[15px] font-semibold text-ink mb-3">How they likely interview</h3>
              <p className="text-sm text-ink/80 leading-relaxed">{job.brief.interviewStyle.summary}</p>
              <p className="text-[11px] text-muted mt-3">
                {job.brief.interviewStyle.confidenceSource === 'careers_page'
                  ? `Based on ${job.companyName}'s own careers page`
                  : 'Based on general patterns for companies of this size and stage'}
              </p>
              <button
                onClick={() => navigate(roleTitle
                  ? `/interview/new?company=${encodeURIComponent(job.companyName)}&url=${encodeURIComponent(job.companyUrl || '')}&role=${encodeURIComponent(roleTitle)}`
                  : `/interview/new?company=${encodeURIComponent(job.companyName)}&url=${encodeURIComponent(job.companyUrl || '')}`,
                )}
                className="inline-flex items-center gap-1 text-xs text-teal font-medium hover:text-teal-dark transition-colors mt-3"
              >
                Practice an interview for this company <IconChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Block 7 — Questions to Ask */}
            {job.brief.questionsToAsk.length > 0 && (
              <div className="card">
                <h3 className="text-[15px] font-semibold text-ink mb-1">Smart questions to ask them</h3>
                <p className="text-xs text-muted mb-4">Specific to this company, not generic interview filler</p>
                <ol className="space-y-4">
                  {job.brief.questionsToAsk.map((q, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm text-ink leading-snug">{q.question}</p>
                        <p className="text-xs text-muted mt-1">{q.rationale}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Block 8 — Red Flags */}
            {job.brief.redFlags && job.brief.redFlags.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-[15px] font-semibold text-ink">Worth knowing before you apply</h3>
                </div>
                <div className="space-y-3">
                  {job.brief.redFlags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                      <div>
                        <p className="text-sm text-ink/80">{flag.flag}</p>
                        <p className="text-[11px] text-muted mt-0.5">Source: {flag.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block 9 — Next Steps */}
            <div className="bg-paper rounded-xl p-6 space-y-6">
              <h2 className="font-display text-[22px] font-bold text-ink">What to do with this</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4 space-y-3 flex flex-col">
                  <IconTargetArrow className="h-8 w-8 text-teal" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">Practice interview</p>
                    <p className="text-xs text-muted mt-1">Run a mock interview for {job.companyName}</p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(roleTitle
                      ? `/interview/new?company=${encodeURIComponent(job.companyName)}&url=${encodeURIComponent(job.companyUrl || '')}&role=${encodeURIComponent(roleTitle)}`
                      : `/interview/new?company=${encodeURIComponent(job.companyName)}&url=${encodeURIComponent(job.companyUrl || '')}`,
                    )}
                    className="w-full"
                  >
                    Practice
                  </Button>
                </div>

                <div className="card p-4 space-y-3 flex flex-col">
                  <IconTargetArrow className="h-8 w-8 text-amber" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">Tailor your resume</p>
                    <p className="text-xs text-muted mt-1">See how your resume scores for roles here</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/ats')}
                    className="w-full"
                  >
                    Check fit
                  </Button>
                </div>

                <div className="card p-4 space-y-3 flex flex-col">
                  <IconMail className="h-8 w-8 text-teal" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">Write a cover letter</p>
                    <p className="text-xs text-muted mt-1">Generate a letter that references what they're actually building</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/cover-letter/new')}
                    className="w-full"
                  >
                    Write letter
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
