import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useResume } from '../lib/queries'
import { ScoreRing } from '../components/ScoreRing'
import PdfViewer from '../components/PdfViewer'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import { IconCircleCheck, IconAlertTriangle, IconChevronDown, IconChevronRight, IconSparkles, IconFileText, IconCircleX, IconRefresh, IconAward, IconBook, IconCode, IconGlobe, IconLanguage, IconBulb, IconChartBar, IconEye, IconListCheck, IconTrendingUp, IconClock } from '@tabler/icons-react'

type StreamingState = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error'

function ScoreHeroBlock({
  score,
  detectedRole,
}: {
  score: number
  detectedRole?: { role: string; seniority: string; industries: string[]; confidence: number } | null
}) {
  const getInterpretation = (s: number) => {
    if (s >= 85) return 'Your resume is highly competitive.'
    if (s >= 70) return 'Good foundation, but there are key gaps.'
    if (s >= 50) return 'Room for improvement—major sections need work.'
    return 'Needs significant improvement. Start with the red flags.'
  }

  return (
    <div className="bg-ink text-white rounded-xl overflow-hidden">
      <div className="flex items-center gap-8 p-8 pb-6">
        <ScoreRing score={score} size={140} strokeWidth={8} scoreClassName="text-white" />
        <div className="flex-1 pt-1">
          <span className="label-uppercase text-teal">Resume score</span>
          <h2 className="font-display text-h2 text-white mt-1 leading-tight">
            {getInterpretation(score)}
          </h2>
          <p className="text-small text-muted-light mt-2 max-w-lg">
            Your resume scores {score}/100 overall. {score >= 70 ? 'The section breakdown below shows where you stand.' : 'Focus on the red flags and next actions below.'}
          </p>
          {detectedRole && (
            <div className="flex items-center gap-2.5 mt-4 flex-wrap">
              <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Role</span>
              <span className="text-[11px] font-semibold text-white bg-teal/20 px-2 py-0.5 rounded-md">{detectedRole.role}</span>
              <span className="text-[10px] text-muted">&middot;</span>
              <span className="text-[11px] font-medium text-white capitalize">{detectedRole.seniority}</span>
              <span className="text-[9px] text-muted-light">{detectedRole.confidence}% confidence</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StrengthsBlock({ strengths }: { strengths: string[] }) {
  if (!strengths?.length) return null
  return (
    <div className="card h-full">
      <div className="section-title mb-4">
        <IconAward className="h-4 w-4 text-success" />
        Strengths
      </div>
      <ul className="space-y-2.5">
        {strengths.map((s, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 + 0.2, duration: 0.3 }}
            className="flex items-start gap-2.5 text-sm text-ink leading-relaxed"
          >
            <IconCircleCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
            {s}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function RedFlagsBlock({ redFlags }: { redFlags: Array<{ message: string; reason?: string; severity?: string }> }) {
  if (!redFlags?.length) return null

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return { icon: 'text-danger', border: 'border-danger/30', bg: 'bg-danger-light' }
      case 'medium': return { icon: 'text-amber', border: 'border-amber/30', bg: 'bg-amber-light' }
      default: return { icon: 'text-muted', border: 'border-border', bg: 'bg-paper-light' }
    }
  }

  return (
    <div className="card h-full">
      <div className="section-title mb-4">
        <IconAlertTriangle className="h-4 w-4 text-danger" />
        Red Flags
      </div>
      <ul className="space-y-2.5">
        {redFlags.map((f, i) => {
          const colors = getSeverityColor(f.severity)
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 + 0.3, duration: 0.3 }}
              className={`flex items-start gap-2.5 text-sm text-ink leading-relaxed p-2.5 rounded-lg ${colors.bg} border ${colors.border}`}
            >
              <IconAlertTriangle className={`h-4 w-4 ${colors.icon} shrink-0 mt-0.5`} />
              <div>
                <span className="font-medium">{f.message}</span>
                {f.reason && (
                  <div className="text-[11px] text-muted mt-0.5 leading-snug">{f.reason}</div>
                )}
              </div>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

function SectionBreakdownBlock({ sectionScores }: { sectionScores: Record<string, number> }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (!sectionScores || !Object.keys(sectionScores).length) return null

  const toggleSection = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div>
      <div className="section-title mb-4">
        <IconChartBar className="h-4 w-4 text-muted" />
        Section Breakdown
      </div>
      <div className="space-y-2">
        {Object.entries(sectionScores).map(([section, sectionScore], idx) => {
          const isExpanded = expanded[section]
          const color = sectionScore >= 75 ? 'var(--color-score-high)' : sectionScore >= 50 ? 'var(--color-score-mid)' : 'var(--color-score-low)'
          return (
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 + 0.4, duration: 0.3 }}
              className="card !py-3 !px-4 cursor-pointer hover:border-teal/30 transition-colors"
              onClick={() => toggleSection(section)}
            >
              <div className="flex items-center gap-4">
                <span className="font-display text-h4 text-ink w-14 text-right shrink-0">{sectionScore}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-ink">{section}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{sectionScore}%</span>
                      {isExpanded ? <IconChevronDown className="h-3.5 w-3.5 text-muted" /> : <IconChevronRight className="h-3.5 w-3.5 text-muted" />}
                    </div>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${sectionScore}%`, backgroundColor: color }} />
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-border">
                      <p className="text-xs text-muted leading-relaxed">
                        {sectionScore >= 75
                          ? `Your ${section.toLowerCase()} section is strong. Minor refinements could elevate it further.`
                          : sectionScore >= 50
                            ? `Your ${section.toLowerCase()} section has a solid foundation but needs targeted improvements to perform better.`
                            : `Your ${section.toLowerCase()} section requires significant attention. Review the red flags and next actions above.`}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function MissingElementsBlock({ resume }: { resume: { skills?: string[]; certifications?: Array<{ name: string }>; languages?: string[]; contact?: { linkedin?: string | null; github?: string | null; website?: string | null } } }) {
  const gaps: Array<{ icon: React.ReactNode; label: string; present: boolean }> = [
    { icon: <IconCode className="h-3.5 w-3.5" />, label: 'Skills', present: !!resume.skills?.length },
    { icon: <IconAward className="h-3.5 w-3.5" />, label: 'Certifications', present: !!resume.certifications?.length },
    { icon: <IconLanguage className="h-3.5 w-3.5" />, label: 'Languages', present: !!resume.languages?.length },
    { icon: <IconGlobe className="h-3.5 w-3.5" />, label: 'LinkedIn', present: !!resume.contact?.linkedin },
    { icon: <IconGlobe className="h-3.5 w-3.5" />, label: 'GitHub', present: !!resume.contact?.github },
    { icon: <IconGlobe className="h-3.5 w-3.5" />, label: 'Portfolio', present: !!resume.contact?.website },
  ]

  const missing = gaps.filter(g => !g.present)

  return (
    <div>
      <div className="section-title mb-4">
        <IconListCheck className="h-4 w-4 text-muted" />
        Missing Elements
      </div>
      {missing.length === 0 ? (
        <div className="card text-center py-6">
          <IconCircleCheck className="h-8 w-8 text-success mx-auto mb-2" />
          <p className="text-sm text-ink font-medium">All key sections present</p>
          <p className="text-xs text-muted mt-0.5">Your resume covers all the essential elements.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {missing.map((g, i) => (
            <motion.div
              key={g.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 + 0.5, duration: 0.2 }}
              className="card !p-3 flex flex-col items-center gap-1.5 text-center"
            >
              <div className="h-8 w-8 rounded-full bg-danger-light flex items-center justify-center text-danger">
                {g.icon}
              </div>
              <span className="text-xs font-medium text-ink">{g.label}</span>
              <span className="text-[10px] text-muted">Missing</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResumePreviewBlock({ fileUrl, rawText }: { fileUrl?: string | null; rawText?: string | null }) {
  const [view, setView] = useState<'pdf' | 'text'>('pdf')

  if (!fileUrl && !rawText) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="section-title">
          <IconEye className="h-4 w-4 text-muted" />
          Resume Preview
        </div>
        <div className="flex items-center gap-1.5 bg-paper rounded-lg border border-border p-0.5">
          <button
            onClick={() => setView('pdf')}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-md transition-colors cursor-pointer',
              view === 'pdf' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            PDF
          </button>
          <button
            onClick={() => setView('text')}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-md transition-colors cursor-pointer',
              view === 'text' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            Text
          </button>
        </div>
      </div>
      <div className="card !p-0 overflow-hidden">
        {view === 'pdf' && fileUrl ? (
          <PdfViewer fileUrl={fileUrl} className="p-4 min-h-[300px]" />
        ) : view === 'text' && rawText ? (
          <div className="p-5 max-h-[400px] overflow-y-auto">
            <pre className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans">{rawText.slice(0, 5000)}{rawText.length > 5000 ? '...' : ''}</pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted text-xs">
            No preview available
          </div>
        )}
      </div>
    </div>
  )
}

function NextActionsBlock({ suggestions }: { suggestions: string[] }) {
  if (!suggestions?.length) return null

  return (
    <div>
      <div className="section-title mb-4">
        <IconBulb className="h-4 w-4 text-amber" />
        Next Actions
      </div>
      <div className="card">
        <ul className="space-y-2">
          {suggestions.map((s, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 + 0.6, duration: 0.25 }}
              className="flex items-start gap-3 text-sm text-ink leading-relaxed"
            >
              <span className="h-5 w-5 rounded-full bg-teal-light text-teal text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{s}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ReviewHistoryBlock() {
  return (
    <div>
      <div className="section-title mb-4">
        <IconTrendingUp className="h-4 w-4 text-muted" />
        Review History
      </div>
      <div className="card text-center py-6">
        <IconClock className="h-8 w-8 text-muted-light mx-auto mb-2" />
        <p className="text-sm text-muted">No previous reviews</p>
        <p className="text-xs text-muted-light mt-0.5">Future analyses will appear here.</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="page-container">
      <div className="animate-pulse space-y-6 max-w-2xl mx-auto">
        <div className="h-4 w-24 bg-border/60 rounded" />
        <div className="bg-ink/10 rounded-xl h-48" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-border/30 rounded-xl" />
          <div className="h-48 bg-border/30 rounded-xl" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-border/20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ id, onAnalyze, analyzing }: { id: string; onAnalyze: () => void; analyzing: boolean }) {
  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-8">
        <Link to={`/resume/${id}`} className="text-sm text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5">
          &larr; Back to editor
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center">
        <IconFileText className="h-12 w-12 text-muted-light mb-4" />
        <h2 className="font-display text-h3 text-ink mb-2">Not yet analysed</h2>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          Run an analysis to get a detailed breakdown of your resume&apos;s strengths, red flags, and actionable improvements.
        </p>
        <Button variant="primary" size="lg" onClick={onAnalyze} disabled={analyzing}>
          {analyzing ? (
            <span className="flex items-center gap-2">
              <IconRefresh className="h-4 w-4 animate-spin" />
              Analysing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <IconSparkles className="h-4 w-4" />
              Analyse Resume
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}

function ErrorState({ id, message, onRetry }: { id: string; message?: string; onRetry: () => void }) {
  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-8">
        <Link to={`/resume/${id}`} className="text-sm text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5">
          &larr; Back to editor
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center">
        <IconCircleX className="h-12 w-12 text-danger mb-4" />
        <h2 className="font-display text-h3 text-ink mb-2">Could not complete analysis</h2>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          {message || 'The AI was temporarily unavailable. Try again in a moment.'}
        </p>
        <Button variant="primary" size="lg" onClick={onRetry}>
          <IconRefresh className="h-4 w-4 mr-1.5" />
          Try Again
        </Button>
      </div>
    </div>
  )
}

function StreamingStatusBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-teal/5 border border-teal/20 rounded-lg mb-8">
      <IconRefresh className="h-4 w-4 text-teal animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-teal truncate">{label}</span>
          <span className="text-[11px] text-muted">Analysing</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill bg-teal" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

export default function ResumeReview() {
  const { id } = useParams<{ id: string }>()
  const { data: resume, isLoading, refetch } = useResume(id!)
  const [streamState, setStreamState] = useState<StreamingState>('idle')
  const [streamLabel, setStreamLabel] = useState('')
  const [streamError, setStreamError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const hasReviewData = resume?.score != null
  const score = resume?.score ?? resume?.overallScore ?? 0
  const strengths = resume?.quality?.strengths ?? []
  const redFlags = resume?.redFlags ?? []
  const sectionScores = resume?.sectionScores ?? {}
  const qualitySuggestions = resume?.quality?.suggestions ?? []

  const startStream = useCallback(async () => {
    if (!id) return
    setStreamState('connecting')
    setStreamLabel('Starting analysis...')
    setStreamError('')

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/resumes/${id}/review-stream`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: abort.signal,
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      setStreamState('streaming')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      let currentEvent = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            let data
            try {
              data = JSON.parse(line.slice(6))
            } catch {
              currentEvent = ''
              continue
            }

            if (currentEvent === 'progress') {
              setStreamLabel(data.label || data.step || 'Processing...')
            } else if (currentEvent === 'complete') {
              setStreamState('complete')
              setStreamLabel('Complete')
              refetch()
            } else if (currentEvent === 'error') {
              throw new Error(data.message || 'Analysis failed')
            }
            currentEvent = ''
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setStreamError(err.message || 'Analysis failed')
      setStreamState('error')
    }
  }, [id, refetch])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  if (isLoading) return <LoadingSkeleton />

  if (!resume) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-20">
          <IconFileText className="h-12 w-12 text-muted-light mb-4" />
          <h2 className="font-display text-h3 text-ink mb-2">Resume not found</h2>
          <Link to="/dashboard">
            <Button variant="primary" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!hasReviewData && streamState === 'idle') {
    return <EmptyState id={id!} onAnalyze={startStream} analyzing={false} />
  }

  if (streamState === 'error') {
    return <ErrorState id={id!} message={streamError} onRetry={startStream} />
  }

  if (streamState === 'connecting' || streamState === 'streaming') {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-8">
          <Link to={`/resume/${id}`} className="text-sm text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5">
            &larr; Back to editor
          </Link>
        </div>
        <StreamingStatusBar label={streamLabel} />
      </div>
    )
  }

  // SSE completed but refetch hasn't landed yet — show skeleton
  if (streamState === 'complete' && !hasReviewData) {
    return <LoadingSkeleton />
  }

  const showStrengths = strengths.length > 0
  const showRedFlags = redFlags.length > 0
  const showSectionScores = Object.keys(sectionScores).length > 0
  const showMissingElements = true
  const showPreview = resume.fileUrl || resume.rawText
  const showNextActions = qualitySuggestions.length > 0

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Link to={`/resume/${id}`} className="text-sm text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5 mb-8">
            &larr; Back to editor
          </Link>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* 1. Score Hero */}
          <motion.div variants={itemVariants}>
            <ScoreHeroBlock score={score} detectedRole={resume.detectedRole} />
          </motion.div>

          {/* 2. Strengths & Red Flags */}
          {(showStrengths || showRedFlags) && (
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showStrengths && <StrengthsBlock strengths={strengths} />}
                {showRedFlags && <RedFlagsBlock redFlags={redFlags} />}
              </div>
            </motion.div>
          )}

          {/* 3. Section Breakdown */}
          {showSectionScores && (
            <motion.div variants={itemVariants}>
              <SectionBreakdownBlock sectionScores={sectionScores} />
            </motion.div>
          )}

          {/* 4. Missing Elements */}
          {showMissingElements && (
            <motion.div variants={itemVariants}>
              <MissingElementsBlock resume={resume} />
            </motion.div>
          )}

          {/* 5. Resume Preview */}
          {showPreview && (
            <motion.div variants={itemVariants}>
              <ResumePreviewBlock fileUrl={resume.fileUrl} rawText={resume.rawText} />
            </motion.div>
          )}

          {/* 6. Next Actions */}
          {showNextActions && (
            <motion.div variants={itemVariants}>
              <NextActionsBlock suggestions={qualitySuggestions} />
            </motion.div>
          )}

          {/* Bottom actions */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 pt-2 pb-6">
            <Link to={`/resume/${id}`}>
              <Button variant="ghost">
                <IconBook className="h-4 w-4 mr-1.5" />
                Edit Resume
              </Button>
            </Link>
            <Button variant="primary" onClick={startStream}>
              <IconRefresh className="h-4 w-4 mr-1.5" />
              Re-analyse
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
