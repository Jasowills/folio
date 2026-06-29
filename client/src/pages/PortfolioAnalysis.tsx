import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useResumes, useAnalyzePortfolio, usePortfolioStatus, useStats } from '../lib/queries'
import { ScoreRing } from '../components/ScoreRing'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { IconCircleCheck, IconAlertTriangle, IconExternalLink } from '@tabler/icons-react'

const statusLabels: Record<string, string> = {
  pending: 'Starting analysis...',
  crawling: 'Crawling portfolio pages...',
  analysing: 'Comparing with your resume...',
  comparing: 'Comparing with your resume...',
  completing: 'Generating suggestions...',
}

const statusOrder = ['pending', 'crawling', 'analysing', 'comparing', 'completing']

const processSteps = [
  'Portfolio URL validated',
  'Found pages to crawl',
  'Crawling pages...',
  'Taking screenshots',
  'Comparing with your resume',
  'Generating suggestions',
]

function stepState(currentIdx: number, stepIdx: number) {
  if (currentIdx === -1) return 'waiting'
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'active'
  return 'waiting'
}

function scoreInterpretation(score: number) {
  if (score >= 80) return 'Your portfolio strongly backs up your resume.'
  if (score >= 60) return 'Room to tighten the alignment between your portfolio and resume.'
  return 'Your resume and portfolio tell different stories.'
}

export default function PortfolioAnalysis() {
  const { data: stats } = useStats()
  const { data: resumes } = useResumes()
  const analyze = useAnalyzePortfolio()
  const [resumeId, setResumeId] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [analysisId, setAnalysisId] = useState<string | null>(null)

  const { data: result, error: statusError, isLoading: statusLoading } = usePortfolioStatus(analysisId)

  const [animatedScore, setAnimatedScore] = useState(0)
  const animFrameRef = useRef<number>(undefined)

  const isComplete = result?.status === 'completed'
  const isFailed = result?.status === 'failed'
  const status = (result?.status as string) || 'pending'
  const currentIdx = statusOrder.indexOf(status)
  const hasPastAnalyses = (stats?.portfolioAnalyses ?? 0) > 0

  console.log('[Portfolio] Render state:', {
    analysisId,
    resultStatus: result?.status,
    statusError: statusError ? ((statusError as any)?.message || String(statusError)) : null,
    statusLoading,
    isComplete,
    isFailed,
  })

  useEffect(() => {
    if (isComplete) {
      const target = result!.overallScore
      const duration = 800
      const start = performance.now()
      function tick(now: number) {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setAnimatedScore(Math.round(eased * target))
        if (progress < 1) animFrameRef.current = requestAnimationFrame(tick)
      }
      animFrameRef.current = requestAnimationFrame(tick)
      return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
    }
    setAnimatedScore(0)
  }, [isComplete, result?.overallScore])

  const handleAnalyze = async () => {
    if (!resumeId || !portfolioUrl) {
      console.log('[Portfolio] handleAnalyze: missing resumeId or portfolioUrl', { resumeId, portfolioUrl })
      return
    }
    console.log('[Portfolio] Starting analysis', { resumeId, portfolioUrl })
    try {
      const res = await analyze.mutateAsync({ resumeId, portfolioUrl })
      console.log('[Portfolio] Analysis created', res)
      setAnalysisId(res.analysisId)
    } catch (err) {
      console.error('[Portfolio] Analysis failed:', err)
    }
  }

  const handleReset = () => {
    console.log('[Portfolio] Resetting analysis')
    setAnalysisId(null)
    setPortfolioUrl('')
    setResumeId('')
  }

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
                Analyse your portfolio
              </h2>
              <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
                We'll crawl your portfolio, compare it to your resume, and tell you what skills
                you've proven and what's missing. Limit: up to 10 pages, one analysis per hour.
              </p>
              {!hasPastAnalyses && (
                <p className="text-muted text-sm italic">
                  You haven't analysed your portfolio yet. It takes about a minute.
                </p>
              )}
            </div>

            <div className="card space-y-4">
              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Select resume
                </label>
                <Select
                  value={resumeId}
                  onChange={setResumeId}
                  options={[
                    { value: '', label: 'Choose a resume...' },
                    ...(resumes?.map((r) => ({ value: r._id, label: r.title })) || []),
                  ]}
                  placeholder="Choose a resume..."
                />
              </div>

              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Portfolio URL
                </label>
                <div className="flex gap-2">
                  <input
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="input-field flex-1"
                    placeholder="https://yourname.com"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAnalyze}
                    disabled={!resumeId || !portfolioUrl || analyze.isPending}
                    className="shrink-0"
                  >
                    Analyse
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted text-center">
                This takes about a minute. Stay on this page while we run the analysis.
              </p>
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
                <h3 className="font-display text-h4 text-ink mb-1">
                  Analysis failed
                </h3>
                <p className="text-sm text-muted">
                  Could not complete the portfolio analysis. Try again.
                </p>
              </div>
              <Button variant="primary" size="md" onClick={handleReset}>
                Try again
              </Button>
            </div>
          </motion.div>
        ) : isComplete ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-ink rounded-xl p-8 flex items-center gap-10">
              <div className="shrink-0">
                <ScoreRing
                  score={animatedScore}
                  size={130}
                  label="Portfolio alignment"
                  className="[&_span]:text-white/60"
                  scoreClassName="text-white"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label-uppercase text-white/60 mb-1">
                  Portfolio alignment score
                </p>
                <h2 className="font-display text-h3 text-white mb-2 leading-tight">
                  {scoreInterpretation(result!.overallScore)}
                </h2>
                <p className="text-sm text-white/60 leading-relaxed">
                  {result!.confirmedSkills.length > 0
                    ? `Your portfolio confirms ${result!.confirmedSkills.length} skill${result!.confirmedSkills.length > 1 ? 's' : ''} from your resume.`
                    : 'Your portfolio did not confirm any skills from your resume.'}
                  {result!.missingSkills.length > 0 &&
                    ` ${result!.missingSkills.length} skill${result!.missingSkills.length > 1 ? 's' : ''} listed on your resume lack supporting projects.`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <div className="section-title mb-3">
                  <IconCircleCheck className="h-4 w-4 text-success" />
                  Skills confirmed
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result!.confirmedSkills.length > 0 ? (
                    result!.confirmedSkills.map((s: string) => (
                      <span key={s} className="badge badge-success">
                        {s}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-muted">No confirmed skills yet.</p>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="section-title mb-3">
                  <IconAlertTriangle className="h-4 w-4 text-amber" />
                  Skills missing
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result!.missingSkills.length > 0 ? (
                    result!.missingSkills.map((s: string) => (
                      <span key={s} className="badge badge-danger">
                        {s}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-muted">All resume skills are evidenced.</p>
                  )}
                </div>
                {result!.missingSkills.length > 0 && (
                  <p className="text-xs text-muted mt-3 leading-relaxed">
                    You list these skills on your resume but your portfolio has no projects
                    that evidence them. Add a case study for each.
                  </p>
                )}
              </div>
            </div>

            {result!.projects && result!.projects.length > 0 && (
              <div className="card">
                <div className="section-title mb-4">
                  Projects found ({result!.projects.length})
                </div>
                <div className="space-y-3">
                  {result!.projects.map((p, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg bg-paper border border-border"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-[13px] font-semibold text-ink">{p.name}</h4>
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-teal transition-colors shrink-0"
                          >
                            <IconExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed mb-3 line-clamp-2">
                        {p.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(p.technologies || []).map((t: string) => (
                          <span key={t} className="badge badge-teal">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result!.suggestions && result!.suggestions.length > 0 && (
              <div className="card">
                <div className="section-title mb-4">
                  How to improve your portfolio
                </div>
                <ol className="space-y-3">
                  {result!.suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-ink leading-relaxed pt-0.5">{s}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex justify-center pt-2 pb-4">
              <Button variant="ghost" size="md" onClick={handleReset}>
                Analyse another portfolio
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-xl mx-auto pt-12"
          >
            <div className="bg-ink rounded-xl p-8 text-center space-y-8">
              <span className="font-display text-teal text-4xl animate-pulse block">
                &amp;
              </span>

              <h3 className="font-display text-h4 text-white">
                {statusLabels[status] || 'Processing...'}
              </h3>

              <div className="max-w-xs mx-auto text-left space-y-3">
                {processSteps.map((label, i) => {
                  const state = stepState(currentIdx, i)
                  return (
                    <div key={label} className="flex items-center gap-3">
                      {state === 'done' ? (
                        <span className="h-3 w-3 rounded-full bg-teal flex items-center justify-center shrink-0">
                          <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : state === 'active' ? (
                        <span className="h-3 w-3 rounded-full bg-teal animate-pulse shrink-0" />
                      ) : (
                        <span className="h-3 w-3 rounded-full bg-[#3A3A3A] shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          state === 'done'
                            ? 'text-white'
                            : state === 'active'
                            ? 'text-teal'
                            : 'text-white/30'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <p className="text-sm text-white/40">
                This takes 30–60 seconds. Stay on this page while we run the analysis.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
