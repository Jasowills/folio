import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useResumes, useAtsScore, useAtsHistory, useAtsResult } from '../lib/queries'
import { ScoreRing } from '../components/ScoreRing'
import { Button } from '../components/ui/button'
import { CheckCircle2, XCircle, Target, History } from 'lucide-react'

function getHeadline(score: number): string {
  if (score >= 85) return "Excellent fit. You're well positioned."
  if (score >= 70) return "Strong match. Two gaps to close."
  if (score >= 50) return "Decent alignment. Several keywords missing."
  if (score >= 30) return "Needs work. Core keywords missing."
  return "Weak match. Significant overhaul needed."
}

function getDescription(score: number): string {
  if (score >= 85) return 'Your resume aligns closely with the job requirements. A few minor tweaks and you are ready to apply.'
  if (score >= 70) return 'Your resume covers most of the key requirements. Addressing the missing keywords will strengthen your application significantly.'
  if (score >= 50) return 'Your resume matches some requirements but misses several important keywords. Focus on adding the critical missing terms.'
  if (score >= 30) return 'Your resume is missing many core keywords from the job description. Prioritize adding the must-have terms listed below.'
  return 'Your resume shares little overlap with this role. Consider whether your experience aligns or if a different role would be a better fit.'
}

function sectionLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function sectionColor(name: string): string {
  const key = name.toLowerCase()
  if (key === 'experience') return 'text-amber'
  if (key === 'skills') return 'text-teal'
  if (key === 'education') return 'text-success'
  return 'text-muted'
}

function scoreBadgeClass(score: number): string {
  if (score >= 75) return 'text-score-high'
  if (score >= 50) return 'text-score-mid'
  return 'text-score-low'
}

const PROGRESS_STEPS = [
  'Extracting keywords...',
  'Matching against your resume...',
  'Calculating your score...',
]

export default function AtsScorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('result')

  const { data: resumes } = useResumes()
  const atsScore = useAtsScore()
  const { data: history } = useAtsHistory()
  const { data: persistedResult } = useAtsResult(selectedId)

  const [resumeId, setResumeId] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [progressStep, setProgressStep] = useState(0)
  const [showProgress, setShowProgress] = useState(false)

  const result = persistedResult ?? null
  const isPending = atsScore.isPending

  useEffect(() => {
    if (!isPending) {
      setShowProgress(false)
      setProgressStep(0)
      return
    }
    setShowProgress(true)
    setProgressStep(0)
    const t1 = setTimeout(() => setProgressStep(1), 1200)
    const t2 = setTimeout(() => setProgressStep(2), 2600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isPending])

  const handleSubmit = async () => {
    if (!resumeId || isPending) return
    setSearchParams({})
    try {
      const res = await atsScore.mutateAsync({
        resumeId,
        jobDescription: jobDescription || undefined,
        jobUrl: jobUrl || undefined,
      })
      setSearchParams({ result: res._id })
    } catch {
      setShowProgress(false)
      setProgressStep(0)
    }
  }

  const handleNewCheck = () => {
    setSearchParams({})
  }

  const handleLoadResult = (id: string) => {
    setSearchParams({ result: id })
  }

  const matchedCount = result?.matchedKeywords?.length ?? 0
  const missingCount = result?.missingKeywords?.length ?? 0
  const sectionScores = result?.sectionScores as Record<string, number> | undefined
  const suggestions = result?.suggestions ?? []

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="page-header">
          <div>
            <h1 className="page-title">ATS Scorer</h1>
            <p className="page-subtitle">
              Check how well your resume matches a job description
            </p>
          </div>
        </div>

        {result && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Checked {new Date(result.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {result.jobTitle && (
                <>
                  <span className="text-muted-light">&middot;</span>
                  <span>{result.jobTitle}</span>
                </>
              )}
            </div>
            <button
              onClick={handleNewCheck}
              className="text-xs text-teal font-medium hover:text-teal-dark transition-colors"
            >
              Run new check
            </button>
          </div>
        )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,400px)_1fr] gap-8 items-start">
          <div className="space-y-4">
            <div className="card space-y-4">
              <h2 className="font-medium text-ink text-sm">
                Check your resume against a job
              </h2>

              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Select resume
                </label>
                <select
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  className="input-field"
                  disabled={isPending}
                >
                  <option value="">Choose a resume...</option>
                  {resumes?.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Job description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="input-field min-h-[160px]"
                  placeholder="Paste the full job description here — the more detail the better."
                  disabled={isPending}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface px-3 text-xs text-muted">or</span>
                </div>
              </div>

              <div>
                <input
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://jobs.company.com/role-title"
                  disabled={isPending}
                />
                <p className="text-xs text-muted mt-1.5">
                  We'll fetch the job description from the URL automatically.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                disabled={!resumeId || isPending}
                className="w-full"
              >
                {isPending ? (
                  <span className="font-display text-white/80 animate-pulse">&amp;</span>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Check my fit
                  </>
                )}
              </Button>

              <AnimatePresence>
                {showProgress && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 pt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse shrink-0" />
                      <span className="text-xs text-muted">{PROGRESS_STEPS[progressStep]}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {history && history.length > 0 && (
              <div className="card">
                <div className="section-title mb-3">
                  <History className="h-3.5 w-3.5 text-muted" />
                  Recent checks
                </div>
                <div className="space-y-0.5">
                  {history.slice(0, 5).map((h) => (
                    <button
                      key={h._id}
                      onClick={() => handleLoadResult(h._id)}
                      className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-paper transition-colors -mx-1"
                    >
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-xs text-ink truncate font-medium">
                          {h.jobTitle || 'ATS Check'}
                        </p>
                        <p className="text-[10px] text-muted">
                          {new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {h.companyName && <> &middot; {h.companyName}</>}
                        </p>
                      </div>
                      <span className={`text-xs font-bold ml-3 shrink-0 ${scoreBadgeClass(h.score)}`}>
                        {h.score}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div className="empty-state-icon">&amp;</div>
                  <h3 className="font-display text-h4 text-ink mb-2">
                    No results yet
                  </h3>
                  <p className="text-sm text-muted max-w-sm">
                    Select a resume and paste a job description to see how well you match. Your first check is just a click away.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-ink text-white rounded-xl p-6 space-y-5">
                    <div className="flex items-center gap-6">
                      <ScoreRing
                        score={result.score}
                        size={100}
                        className="shrink-0"
                        scoreClassName="text-white"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-[22px] text-white leading-tight">
                          {getHeadline(result.score)}
                        </h3>
                        <p className="text-xs text-white/60 mt-1.5 leading-relaxed max-w-md">
                          {getDescription(result.score)}
                        </p>
                      </div>
                    </div>

                    {sectionScores && (
                      <div className="flex gap-3">
                        {['experience', 'skills', 'education'].map((section) => {
                          const val = sectionScores[section] ?? sectionScores[sectionLabel(section)]
                          if (val == null) return null
                          return (
                            <div
                              key={section}
                              className="flex-1 rounded-lg bg-white/10 p-3.5 text-center min-w-0"
                            >
                              <span className="font-display text-[22px] text-white leading-none block">
                                {Math.round(val)}
                              </span>
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${sectionColor(section)}`}>
                                {sectionLabel(section)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <div className="section-title mb-3">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Keywords matched ({matchedCount})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(result.matchedKeywords || []).map((kw) => (
                        <span
                          key={kw.keyword}
                          className="badge badge-success"
                        >
                          {kw.keyword}
                        </span>
                      ))}
                      {matchedCount === 0 && (
                        <p className="text-xs text-muted">No keywords matched</p>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="section-title mb-3">
                      <XCircle className="h-4 w-4 text-danger" />
                      Missing keywords ({missingCount})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(result.missingKeywords || []).map((kw) => (
                        <span
                          key={kw.keyword}
                          className={
                            kw.importance === 'critical'
                              ? 'badge bg-danger text-white border border-danger'
                              : 'badge bg-transparent text-danger border border-danger/40'
                          }
                        >
                          {kw.keyword}
                        </span>
                      ))}
                      {missingCount === 0 && (
                        <p className="text-xs text-muted">No missing keywords</p>
                      )}
                    </div>
                    {missingCount > 0 && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        <span className="flex items-center gap-1.5 text-[10px] text-muted">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-danger" />
                          Must-have
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-muted">
                          <span className="inline-block h-2.5 w-2.5 rounded-full border border-danger/40" />
                          Nice-to-have
                        </span>
                      </div>
                    )}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="card">
                      <div className="section-title mb-4">
                        <Target className="h-4 w-4 text-teal" />
                        Priority fixes
                      </div>
                      <ol className="space-y-2.5">
                        {suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="h-5 w-5 rounded-full bg-teal text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-xs text-ink leading-relaxed">{s}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {history && history.length > 0 && (
                    <div className="card lg:hidden">
                      <div className="section-title mb-3">
                        <History className="h-3.5 w-3.5 text-muted" />
                        Recent checks
                      </div>
                      <div className="space-y-0.5">
                        {history.slice(0, 5).map((h) => (
                          <button
                            key={h._id}
                            onClick={() => handleLoadResult(h._id)}
                            className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-paper transition-colors -mx-1"
                          >
                            <div className="text-left min-w-0 flex-1">
                              <p className="text-xs text-ink truncate font-medium">
                                {h.jobTitle || 'ATS Check'}
                              </p>
                              <p className="text-[10px] text-muted">
                                {new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {h.companyName && <> &middot; {h.companyName}</>}
                              </p>
                            </div>
                            <span className={`text-xs font-bold ml-3 shrink-0 ${scoreBadgeClass(h.score)}`}>
                              {h.score}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
