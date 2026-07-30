import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useResumes, useStartResearch, useResearchStatus, useResearchHistory } from '../lib/queries'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import ResearchBrief from './ResearchBrief'
import { cn } from '../lib/utils'
import {
  IconBrandPagekit, IconAlertTriangle,
  IconChevronDown, IconChevronRight, IconHistory, IconWorld, IconCompass,
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
  const [searchParams] = useSearchParams()
  const { data: resumes } = useResumes()
  const startResearch = useStartResearch()
  const { data: history } = useResearchHistory()

  const [companyName, setCompanyName] = useState(searchParams.get('company') || '')
  const [companyUrl, setCompanyUrl] = useState(searchParams.get('url') || '')
  const [showRoleContext, setShowRoleContext] = useState(false)
  const [roleTitle, setRoleTitle] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [processingStuck, setProcessingStuck] = useState(false)

  const { data: job } = useResearchStatus(analysisId)

  const isComplete = job?.status === 'completed'
  const isFailed = job?.status === 'failed'
  const isProcessing = !isComplete && !isFailed && !!analysisId

  // Auto-start research if company name from URL params
  const autoStartedRef = useRef(false)
  useEffect(() => {
    const company = searchParams.get('company')
    if (company && !autoStartedRef.current) {
      autoStartedRef.current = true
      const url = searchParams.get('url') || ''
      setCompanyName(company)
      setCompanyUrl(url)
      // Trigger research after a brief delay to let state settle
      const timer = setTimeout(() => {
        const body: any = { companyName: company }
        if (url) body.companyUrl = url
        startResearch.mutateAsync(body).then((res) => {
          setAnalysisId(res.analysisId)
        }).catch((err) => {
          setError((err as Error)?.message || 'Research failed to start')
        })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  // Timeout for stuck processing
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
    setError('')
  }

  const handleNewResearch = () => {
    setAnalysisId(null)
    setCompanyName('')
    setCompanyUrl('')
    setRoleTitle('')
    setResumeId('')
    setShowRoleContext(false)
    setError('')
  }

  const handleLoadHistory = (j: any) => {
    setAnalysisId(j._id)
    setCompanyName(j.companyName)
    if (j.companyUrl) setCompanyUrl(j.companyUrl)
    if (j.roleContext) {
      setRoleTitle(j.roleContext.roleTitle)
      setResumeId(j.roleContext.resumeId || '')
      setShowRoleContext(true)
    }
  }

  const handleUpgrade = async (url: string) => {
    if (!url || !analysisId || !job) return
    setError('')
    try {
      const res = await startResearch.mutateAsync({
        companyName: job.companyName,
        companyUrl: url,
        roleContext: job.roleContext || (roleTitle ? { roleTitle, resumeId: resumeId || undefined } : undefined),
      })
      setAnalysisId(res.analysisId)
    } catch (err) {
      setError((err as Error)?.message || 'Upgrade failed')
    }
  }

  const jobs = (history?.jobs || [])
  const crawlFeedRef = useRef<HTMLDivElement>(null)
  const pages = job?.crawlData?.pagesVisited || []
  const pageCount = job?.crawlData?.pageCount || 0
  const currentlyCrawling = job?.crawlData?.currentlyCrawling || []

  useEffect(() => {
    if (crawlFeedRef.current && pages.length > 0) {
      crawlFeedRef.current.scrollTo({ top: crawlFeedRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [pages.length])

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Left sidebar */}
      <div className="w-[300px] shrink-0 border-r border-border bg-surface flex flex-col">
        {/* Sidebar header */}
        <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">Company Research</h2>
          <p className="text-[11px] text-muted mt-0.5">Research any company before you interview</p>
        </div>

        {/* Compact form */}
        <div className="shrink-0 px-3 py-3 border-b border-border space-y-2.5">
          {error && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-danger-light/50 border border-danger/20">
              <IconAlertTriangle className="h-3 w-3 text-danger mt-0.5 shrink-0" />
              <p className="text-[11px] text-danger">{error}</p>
            </div>
          )}

          <div>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-paper outline-none focus:border-teal transition-colors"
              placeholder="Company name"
              onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
            />
          </div>

          <div>
            <input
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-paper outline-none focus:border-teal transition-colors"
              placeholder="Website URL (optional)"
              onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
            />
          </div>

          <div>
            <button
              onClick={() => setShowRoleContext(!showRoleContext)}
              className="inline-flex items-center gap-1 text-[11px] text-teal font-medium hover:text-teal-dark transition-colors"
            >
              {showRoleContext ? <IconChevronDown className="h-3 w-3" /> : <IconChevronRight className="h-3 w-3" />}
              Role context
            </button>
            <AnimatePresence>
              {showRoleContext && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2 space-y-2"
                >
                  <input
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-paper outline-none focus:border-teal transition-colors"
                    placeholder="e.g. Senior Product Designer"
                  />
                  <Select
                    value={resumeId}
                    onChange={setResumeId}
                    options={[
                      { value: '', label: 'No resume' },
                      ...(resumes?.map((r) => ({ value: r._id, label: r.name || r.title || 'Untitled' })) || []),
                    ]}
                    placeholder="Select resume"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleResearch}
            disabled={!companyName || startResearch.isPending}
            className="w-full"
            loading={startResearch.isPending}
          >
            {!startResearch.isPending && <IconBrandPagekit className="h-3.5 w-3.5 mr-1" />}
            Research
          </Button>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto p-2">
          {jobs.length === 0 ? (
            <div className="text-center py-8 px-3">
              <IconHistory className="h-6 w-6 text-muted-light mx-auto mb-2" />
              <p className="text-xs text-muted">No research history yet</p>
              <p className="text-[10px] text-muted-light mt-1">Research a company to see results here</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {jobs.map((j: any) => {
                const isActive = analysisId === j._id
                return (
                  <button
                    key={j._id}
                    onClick={() => handleLoadHistory(j)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                      isActive ? 'bg-teal-light/30' : 'hover:bg-paper-dark/50',
                    )}
                  >
                    <div className={cn(
                      'h-7 w-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0',
                      j.status === 'completed' ? 'bg-success-light text-success' :
                      j.status === 'failed' ? 'bg-danger-light text-danger' :
                      'bg-paper-dark text-muted'
                    )}>
                      {j.companyName?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink truncate">{j.companyName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {j.status === 'completed' && <IconCircleCheck className="h-2.5 w-2.5 text-success" />}
                        {j.status === 'processing' && <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />}
                        {j.status === 'failed' && <IconAlertTriangle className="h-2.5 w-2.5 text-danger" />}
                        <span className="text-[10px] text-muted">{formatRelativeTime(j.createdAt)}</span>
                      </div>
                    </div>
                    {isActive && (
                      <div className="h-2 w-2 rounded-full bg-teal shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* New research button at bottom when an analysis is active */}
        {analysisId && (
          <div className="shrink-0 p-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={handleNewResearch} className="w-full">
              <IconCompass className="h-3.5 w-3.5 mr-1" />
              New research
            </Button>
          </div>
        )}
      </div>

      {/* Right content pane */}
      <div className="flex-1 bg-surface overflow-y-auto">
        <AnimatePresence mode="wait">
          {!analysisId ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-lg mx-auto pt-16 px-6"
            >
              <div className="text-center space-y-3 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-teal-light flex items-center justify-center mx-auto mb-2">
                  <IconWorld className="h-7 w-7 text-teal" />
                </div>
                <h2 className="font-display text-h4 text-ink">
                  Research a company before you walk in
                </h2>
                <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto">
                  Paste a company name or website and we'll pull together what actually matters
                  — their mission, what they're building, how they likely interview, and what to bring up.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-5 space-y-3.5">
                <div>
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                    Company name
                  </label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input-field"
                    placeholder="e.g. Figma"
                    onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                    Company website <span className="text-muted-light font-normal">(optional)</span>
                  </label>
                  <input
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    className="input-field"
                    placeholder="https://company.com"
                    onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                  />
                  <p className="text-[11px] text-muted mt-1">
                    A URL gives us their actual mission, values, and recent news — strongly recommended.
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => setShowRoleContext(!showRoleContext)}
                    className="inline-flex items-center gap-1 text-xs text-teal font-medium hover:text-teal-dark transition-colors"
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
                          <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
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
                          <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
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
                  loading={startResearch.isPending}
                >
                  {!startResearch.isPending && <IconBrandPagekit className="h-4 w-4 mr-1.5" />}
                  Research this company
                </Button>
              </div>

              {/* Recent history on empty state */}
              {jobs.length > 0 && (
                <div className="mt-6 bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <IconHistory className="h-3.5 w-3.5 text-muted" />
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Recent</span>
                  </div>
                  <div className="space-y-0.5">
                    {jobs.slice(0, 5).map((j: any) => (
                      <button
                        key={j._id}
                        onClick={() => handleLoadHistory(j)}
                        className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-paper transition-colors"
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
              className="max-w-lg mx-auto pt-16 px-6"
            >
              <div className="bg-ink rounded-xl p-8 space-y-6">
                <div className="text-center space-y-3">
                  <IconWorld className="h-8 w-8 text-teal mx-auto" style={{ animation: 'breathe 2s ease-in-out infinite' }} />
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
                    <div ref={crawlFeedRef} className="max-h-64 overflow-y-auto space-y-1.5 -mx-2 px-2">
                      {pages.length === 0 && (
                        <div className="flex items-center gap-2 text-sm text-white/30">
                          <span className="h-2 w-2 rounded-full bg-teal animate-pulse shrink-0" />
                          Gathering information...
                        </div>
                      )}
                      {pages.map((p: any, i: number) => {
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
                              <p className="text-xs truncate text-white/60">{p.title || hostname}</p>
                              <p className="text-[10px] text-white/30 truncate">{hostname}</p>
                            </div>
                          </motion.div>
                        )
                      })}
                      {currentlyCrawling.map((c: any) => {
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
                              <p className="text-xs truncate text-teal/80">Scanning<span className="animate-pulse">...</span></p>
                              <p className="text-[10px] text-white/30 truncate">{hostname}</p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

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
                    {pages.length > 0 && (
                      <span className="text-xs text-teal/70">Scanned {pageCount} source{pageCount !== 1 ? 's' : ''}</span>
                    )}
                    <div className="flex items-center justify-center gap-2 text-sm text-white/40">
                      <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />
                      Generating your research brief...
                    </div>
                  </div>
                )}

                {processingStuck && (
                  <div className="text-center space-y-3 pt-2 border-t border-white/10">
                    <p className="text-xs text-amber-400/80">Taking longer than expected. Try again.</p>
                    <button onClick={handleReset} className="text-xs text-teal hover:text-teal-light transition-colors">
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
              className="max-w-lg mx-auto pt-16 px-6"
            >
              <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-4">
                <IconAlertTriangle className="h-10 w-10 text-danger mx-auto" />
                <div>
                  <h3 className="font-display text-h4 text-ink mb-1">Research failed</h3>
                  <p className="text-sm text-muted">{job?.error || 'Could not complete the research.'}</p>
                </div>
                <Button variant="primary" size="md" onClick={handleReset}>Try again</Button>
              </div>
            </motion.div>
          ) : isComplete && job?.brief ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ResearchBrief
                job={job}
                onReset={handleNewResearch}
                onUpgrade={handleUpgrade}
                upgradePending={startResearch.isPending}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
