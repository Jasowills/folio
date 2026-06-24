import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useStats, useResumes, useAtsHistory, useUploadResume } from '../lib/queries'
import { UploadZone } from '../components/UploadZone'
import { Button } from '../components/ui/button'
import {
  FileText,
  Target,
  Mail,
  Globe,
  ArrowRight,
  Clock,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Zap,
  Upload,
  CheckCircle,
  Sparkles,
} from 'lucide-react'

const GREETINGS = [
  { start: 6, end: 12, text: 'Good morning', icon: Sparkles, subtitle: 'Ready to tell your career story today?' },
  { start: 12, end: 17, text: 'Good afternoon', icon: TrendingUp, subtitle: 'Keep building — opportunities don\'t wait.' },
  { start: 17, end: 22, text: 'Good evening', icon: Lightbulb, subtitle: 'Perfect time to polish your resume.' },
  { start: 22, end: 6, text: 'Working late', icon: Zap, subtitle: 'Dedication looks great on a resume.' },
]

function useGreeting() {
  const h = new Date().getHours()
  return GREETINGS.find((g) => (g.start <= g.end ? h >= g.start && h < g.end : h >= g.start || h < g.end)) ?? GREETINGS[0]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const duration = 800
    const from = 0
    const to = value

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }

    ref.current = requestAnimationFrame(tick)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
  }, [value])

  return <>{display}{suffix}</>
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-score-high'
  if (score >= 50) return 'text-score-mid'
  return 'text-score-low'
}

function scoreBg(score: number) {
  if (score >= 75) return 'bg-score-high/10 text-score-high'
  if (score >= 50) return 'bg-score-mid/10 text-score-mid'
  return 'bg-score-low/10 text-score-low'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: resumes, isLoading: resumesLoading } = useResumes()
  const { data: atsHistory, isLoading: atsLoading } = useAtsHistory()
  const uploadResume = useUploadResume()
  const [initialUpload, setInitialUpload] = useState(false)
  const greeting = useGreeting()
  const GreetingIcon = greeting.icon

  const hasResume = resumes && resumes.length > 0
  const latestResume = resumes?.[0]
  const highFlags = latestResume?.redFlags?.filter((f) => f.severity === 'high') ?? []
  const isFirstTime = !hasResume && !initialUpload

  const handleFile = useCallback(
    async (file: File) => {
      setInitialUpload(true)
      try {
        const result = await uploadResume.mutateAsync(file)
        if (result?._id) {
          navigate('/resumes')
        }
      } catch {
        setInitialUpload(false)
      }
    },
    [uploadResume, navigate],
  )

  function handleFAB() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.docx,.doc'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFile(file)
    }
    input.click()
  }

  if (isFirstTime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center"
        >
          <div className="empty-state-icon">&amp;</div>
          <h2 className="font-display text-h2 text-ink mb-3">
            Your story starts <span className="italic">here.</span>
          </h2>
          <p className="text-body text-muted mb-8 max-w-sm mx-auto">
            Upload your resume to get started or build one from scratch.
          </p>
          <UploadZone onFile={handleFile} />
          <Link
            to="/resumes"
            className="inline-block mt-5 text-sm text-teal font-medium hover:text-teal-dark transition-colors"
          >
            or build from scratch &rarr;
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="page-container relative">
      {highFlags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 mb-6 rounded-lg bg-gradient-to-r from-red-500/10 via-orange-500/10 to-transparent border border-red-200/30"
        >
          <AlertTriangle className="h-5 w-5 text-red shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red">
              {highFlags.length} high-severity {highFlags.length === 1 ? 'issue' : 'issues'} found
            </p>
            <p className="text-xs text-muted mt-0.5">{highFlags[0].message}</p>
          </div>
          <Link to={`/resume/${latestResume!._id}/review`}>
            <Button variant="ghost" size="sm" className="shrink-0 text-xs">
              Review
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </motion.div>
      )}

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={sectionVariants} className="page-header">
          <div>
            <div className="flex items-center gap-2.5">
              <GreetingIcon className="h-5 w-5 text-teal" />
              <h1 className="page-title">
                {greeting.text}, {user?.name?.split(' ')[0] || 'there'}
              </h1>
            </div>
            <p className="page-subtitle">{greeting.subtitle}</p>
          </div>
          <Link to="/resumes">
            <Button variant="primary">
              <FileText className="h-4 w-4 mr-2" />
              New Resume
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="stat-card">
                  <div className="h-8 w-8 rounded-lg bg-border/50 animate-pulse mb-3" />
                  <div className="h-7 w-16 bg-border/50 animate-pulse rounded" />
                  <div className="h-3 w-20 bg-border/50 animate-pulse rounded mt-2" />
                </div>
              ))}
            </>
          ) : (
            <>
              <Link to={latestResume ? `/resume/${latestResume._id}/review` : '/resumes'} className="stat-card group">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-teal-light">
                    <FileText className="h-4 w-4 text-teal" />
                  </div>
                  <span className="label-uppercase text-muted">Resume Score</span>
                </div>
                <span className="font-display text-h2 text-ink leading-none">
                  {latestResume?.quality?.overallQuality != null ? (
                    <CountUp value={Math.round(latestResume.quality.overallQuality)} suffix="%" />
                  ) : (
                    '—'
                  )}
                </span>
              </Link>
              <Link to="/ats" className="stat-card group">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-light">
                    <Target className="h-4 w-4 text-amber" />
                  </div>
                  <span className="label-uppercase text-muted">ATS Checks</span>
                </div>
                <span className="font-display text-h2 text-ink leading-none">
                  <CountUp value={stats?.atsScores ?? 0} />
                </span>
              </Link>
              <Link to="/cover-letters" className="stat-card group">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-teal-light">
                    <Mail className="h-4 w-4 text-teal" />
                  </div>
                  <span className="label-uppercase text-muted">Cover Letters</span>
                </div>
                <span className="font-display text-h2 text-ink leading-none">
                  <CountUp value={stats?.coverLetters ?? 0} />
                </span>
              </Link>
              <Link to="/portfolio" className="stat-card group">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-light">
                    <Globe className="h-4 w-4 text-amber" />
                  </div>
                  <span className="label-uppercase text-muted">Portfolio</span>
                </div>
                <span className="font-display text-h2 text-ink leading-none">
                  <CountUp value={stats?.portfolioAnalyses ?? 0} />
                </span>
              </Link>
            </>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          <div className="space-y-6">
            {resumesLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card">
                    <div className="h-5 w-32 bg-border/50 animate-pulse rounded mb-4" />
                    <div className="h-16 bg-border/50 animate-pulse rounded" />
                  </div>
                ))}
              </>
            ) : (
              <motion.div variants={sectionVariants} className="space-y-3">
                <div className="section-title mb-3">
                  <FileText className="h-4 w-4 text-teal" />
                  My Resumes
                  <span className="text-xs text-muted font-normal ml-2">
                    ({resumes?.length ?? 0})
                  </span>
                </div>
                {resumes?.slice(0, 3).map((resume) => {
                  const score = resume.quality?.overallQuality ?? 0
                  const hasScore = resume.quality?.overallQuality != null
                  return (
                    <div key={resume._id} className="card card-hover">
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="h-14 w-11 rounded border border-border bg-white flex items-center justify-center shadow-sm">
                            <FileText className="h-5 w-5 text-muted" />
                          </div>
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-border rounded-tr-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink text-sm leading-tight">
                              {resume.title || resume.name || 'Untitled'}
                            </p>
                            {hasScore && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${scoreBg(score)}`}>
                                {Math.round(score)}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-1">
                            {resume.filename || 'PDF'}
                            <span className="mx-1.5">&middot;</span>
                            {new Date(resume.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <div className="flex items-center gap-2 mt-2.5">
                            <Link to={`/resume/${resume._id}`}>
                              <Button variant="ghost" size="sm" className="text-xs h-7 px-2.5">
                                Edit
                              </Button>
                            </Link>
                            <Link to={`/resume/${resume._id}/review`}>
                              <Button variant="ghost" size="sm" className="text-xs h-7 px-2.5">
                                Review
                              </Button>
                            </Link>
                            <Link to={`/ats`}>
                              <Button variant="ghost" size="sm" className="text-xs h-7 px-2.5">
                                ATS Check
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {resumes && resumes.length > 3 && (
                  <Link
                    to="/resumes"
                    className="block text-center text-xs text-muted hover:text-teal transition-colors py-2"
                  >
                    View all {resumes.length} resumes &rarr;
                  </Link>
                )}
              </motion.div>
            )}

            {atsLoading ? (
              <div className="card">
                <div className="h-5 w-28 bg-border/50 animate-pulse rounded mb-4" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-border/50 animate-pulse rounded mb-2" />
                ))}
              </div>
            ) : atsHistory && atsHistory.length > 0 ? (
              <motion.div variants={sectionVariants} className="card">
                <div className="section-title mb-4">
                  <Target className="h-4 w-4 text-amber" />
                  ATS Score History
                </div>
                <div className="relative pl-7">
                  <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border" />
                  {atsHistory.slice(0, 3).map((check, i) => (
                    <div key={check._id} className="relative pb-4 last:pb-0">
                      <div className={`absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${scoreBg(check.score)}`} style={{ backgroundClip: 'padding-box' }} />
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {check.jobTitle || 'ATS Check'}
                          </p>
                          {check.companyName && (
                            <p className="text-xs text-muted mt-0.5">{check.companyName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-bold ${scoreColor(check.score)}`}>
                            {check.score}%
                          </span>
                          <span className="text-[10px] text-muted">
                            {new Date(check.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {atsHistory.length > 3 && (
                  <Link to="/ats" className="block text-center text-xs text-muted hover:text-teal transition-colors mt-3 pt-2 border-t border-border">
                    View all ATS checks &rarr;
                  </Link>
                )}
              </motion.div>
            ) : null}
          </div>

          <div className="space-y-6">
            <motion.div variants={sectionVariants} className="card">
              <div className="section-title mb-3">
                <ArrowRight className="h-4 w-4 text-teal" />
                Next Steps
              </div>
              <div className="space-y-1">
                {[
                  {
                    show: true,
                    to: '/ats',
                    icon: Target,
                    bg: 'bg-amber-light',
                    color: 'text-amber',
                    title: latestResume ? 'Check your resume against a job' : 'Upload your first resume',
                    desc: latestResume ? 'See how well you match and what keywords you are missing.' : 'Get started by uploading a PDF or DOCX.',
                  },
                  {
                    show: true,
                    to: '/cover-letters',
                    icon: Mail,
                    bg: 'bg-teal-light',
                    color: 'text-teal',
                    title: 'Generate a cover letter',
                    desc: 'Tailor a letter to any role in under a minute.',
                  },
                  {
                    show: hasResume,
                    to: '/resumes',
                    icon: CheckCircle,
                    bg: 'bg-emerald/10',
                    color: 'text-emerald',
                    title: 'Complete your profile',
                    desc: 'Fill in experience, skills, and education.',
                  },
                  {
                    show: hasResume,
                    to: `/resume/${latestResume?._id}/review`,
                    icon: Lightbulb,
                    bg: 'bg-purple-500/10',
                    color: 'text-purple',
                    title: 'Review improvement suggestions',
                    desc: 'Address red flags and boost your score.',
                  },
                  {
                    show: !!stats?.atsScores && stats.atsScores > 0,
                    to: '/portfolio',
                    icon: Globe,
                    bg: 'bg-amber-light',
                    color: 'text-amber',
                    title: 'Analyse your portfolio',
                    desc: 'See if your online presence matches your resume.',
                  },
                ]
                  .filter((s) => s.show)
                  .slice(0, 4)
                  .map((step) => {
                    const Icon = step.icon
                    return (
                      <Link
                        key={step.title}
                        to={step.to}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-paper transition-colors group"
                      >
                        <div className={`p-2 rounded-lg ${step.bg} shrink-0`}>
                          <Icon className={`h-4 w-4 ${step.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{step.title}</p>
                          <p className="text-xs text-muted mt-0.5">{step.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted group-hover:text-teal transition-colors shrink-0" />
                      </Link>
                    )
                  })}
              </div>
            </motion.div>

            <motion.div variants={sectionVariants} className="card">
              <div className="section-title mb-3">
                <Zap className="h-4 w-4 text-amber" />
                Quick Actions
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Upload Resume', icon: Upload, to: '', action: handleFAB, color: 'text-teal', bg: 'bg-teal-light' },
                  { label: 'ATS Check', icon: Target, to: '/ats', color: 'text-amber', bg: 'bg-amber-light' },
                  { label: 'Cover Letter', icon: Mail, to: '/cover-letters', color: 'text-teal', bg: 'bg-teal-light' },
                  { label: 'Portfolio', icon: Globe, to: '/portfolio', color: 'text-amber', bg: 'bg-amber-light' },
                ].map((action) => {
                  const Icon = action.icon
                  const content = (
                    <div className="flex flex-col items-center gap-1.5 p-3.5 rounded-lg border border-border hover:bg-paper transition-all group cursor-pointer">
                      <div className={`p-2 rounded-lg ${action.bg}`}>
                        <Icon className={`h-4 w-4 ${action.color}`} />
                      </div>
                      <span className="text-xs font-medium text-muted group-hover:text-ink transition-colors">
                        {action.label}
                      </span>
                    </div>
                  )
                  if (action.action) {
                    return (
                      <div key={action.label} onClick={action.action}>
                        {content}
                      </div>
                    )
                  }
                  return (
                    <Link key={action.label} to={action.to!}>
                      {content}
                    </Link>
                  )
                })}
              </div>
            </motion.div>

            <motion.div variants={sectionVariants} className="card">
              <div className="section-title mb-3">
                <Clock className="h-4 w-4 text-muted" />
                Recent Activity
              </div>
              {(() => {
                const activities: Array<{ icon: typeof FileText; bg: string; color: string; text: string; time: string }> = []
                if (latestResume) {
                  activities.push({
                    icon: FileText,
                    bg: 'bg-teal-light',
                    color: 'text-teal',
                    text: `Uploaded "${latestResume.title || latestResume.name || 'Untitled'}"`,
                    time: latestResume.updatedAt,
                  })
                }
                const latestAts = atsHistory?.[0]
                if (latestAts) {
                  activities.push({
                    icon: Target,
                    bg: 'bg-amber-light',
                    color: 'text-amber',
                    text: `ATS check: ${latestAts.score}% ${latestAts.jobTitle ? `for ${latestAts.jobTitle}` : ''}`,
                    time: latestAts.createdAt,
                  })
                }

                if (activities.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="empty-state-icon">&amp;</div>
                      <p className="text-xs text-muted">No activity yet</p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-1">
                    {activities.slice(0, 5).map((a, i) => {
                      const Icon = a.icon
                      return (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
                          <div className={`p-1.5 rounded-lg ${a.bg} shrink-0`}>
                            <Icon className={`h-3.5 w-3.5 ${a.color}`} />
                          </div>
                          <p className="text-sm text-ink flex-1 min-w-0 truncate">{a.text}</p>
                          <span className="text-[10px] text-muted shrink-0">
                            {new Date(a.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <button
        onClick={handleFAB}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-teal text-white shadow-lg hover:bg-teal-dark transition-all hover:scale-105 active:scale-95 flex items-center justify-center z-20"
        title="Import Resume"
      >
        <Upload className="h-5 w-5" />
      </button>
    </div>
  )
}
