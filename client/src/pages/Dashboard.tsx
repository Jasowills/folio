import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useStats, useResumes, useAtsHistory, useCoverLetters, useUploadResume } from '../lib/queries'
import { UploadZone } from '../components/UploadZone'
import { Button } from '../components/ui/button'
import { IconFileText, IconTargetArrow, IconMail, IconGlobe, IconArrowRight, IconAlertTriangle, IconTrendingUp, IconBulb, IconBolt, IconUpload, IconSparkles, IconUser, IconStar, IconTags } from '@tabler/icons-react'

const GREETINGS = [
  { start: 6, end: 12, text: 'Good morning', icon: IconSparkles, subtitle: 'Time to work on your resume.' },
  { start: 12, end: 17, text: 'Good afternoon', icon: IconTrendingUp, subtitle: 'Keep your resume updated.' },
  { start: 17, end: 22, text: 'Good evening', icon: IconBulb, subtitle: 'Good time to polish your resume.' },
  { start: 22, end: 6, text: 'Working late', icon: IconBolt, subtitle: 'Dedication shows.' },
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
    transition: { duration: 0.4, ease: 'easeOut' as const },
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
  const { data: coverLetters } = useCoverLetters()
  const uploadResume = useUploadResume()
  const [initialUpload, setInitialUpload] = useState(false)
  const greeting = useGreeting()
  const GreetingIcon = greeting.icon

  const hasResume = resumes && resumes.length > 0
  const latestResume = resumes?.[0]
  const highFlags = latestResume?.redFlags?.filter((f) => f.severity === 'high') ?? []
  const isFirstTime = !hasResume && !initialUpload

  const certCount = latestResume?.certifications?.length ?? 0
  const quality = latestResume?.quality

  const allMissingKeywords =
    atsHistory?.flatMap((c) => c.missingKeywords ?? []) ?? []
  const topMissing = allMissingKeywords
    .reduce<{ keyword: string; category: string; importance: string; count: number }[]>((acc, k) => {
      const existing = acc.find((a) => a.keyword === k.keyword)
      if (existing) {
        existing.count++
        if (k.importance === 'critical' || (k.importance === 'important' && existing.importance !== 'critical')) {
          existing.importance = k.importance
        }
      } else {
        acc.push({ keyword: k.keyword, category: k.category, importance: k.importance, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => {
      const order = { critical: 0, important: 1, bonus: 2 }
      return order[a.importance as keyof typeof order] - order[b.importance as keyof typeof order] || b.count - a.count
    })
    .slice(0, 6)

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
            to="/resumes/builder"
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
          <IconAlertTriangle className="h-5 w-5 text-red shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red">
              {highFlags.length} high-severity {highFlags.length === 1 ? 'issue' : 'issues'} found
            </p>
            <p className="text-xs text-muted mt-0.5">{highFlags[0].message}</p>
          </div>
          <Link to={`/resume/${latestResume!._id}/review`}>
            <Button variant="ghost" size="sm" className="shrink-0 text-xs">
              Review
              <IconArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </motion.div>
      )}

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={sectionVariants} className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <GreetingIcon className="h-5 w-5 text-teal" />
                <h1 className="font-display text-h2 text-ink">
                  {greeting.text}, {user?.name?.split(' ')[0] || 'there'}
                </h1>
              </div>
              <p className="text-body text-muted mt-1">{greeting.subtitle}</p>
            </div>
            <Link to="/resumes">
              <Button variant="primary">
                <IconSparkles className="h-4 w-4 mr-2" />
                New Resume
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
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
                    <IconFileText className="h-4 w-4 text-teal" />
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
                    <IconTargetArrow className="h-4 w-4 text-amber" />
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
                    <IconMail className="h-4 w-4 text-teal" />
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
                    <IconGlobe className="h-4 w-4 text-amber" />
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
                  <IconFileText className="h-4 w-4 text-teal" />
                  My Resumes
                  <span className="text-xs text-muted font-normal ml-2">
                    ({resumes?.length ?? 0})
                  </span>
                </div>
                {resumes?.slice(0, 5).map((resume) => {
                  const score = resume.quality?.overallQuality ?? 0
                  const hasScore = resume.quality?.overallQuality != null
                  return (
                    <div key={resume._id} className="card card-hover">
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="h-14 w-11 rounded border border-border bg-white flex items-center justify-center shadow-sm">
                            <IconFileText className="h-5 w-5 text-muted" />
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

            {quality && (
              <motion.div variants={sectionVariants} className="card">
                <div className="section-title mb-4">
                  <IconStar className="h-4 w-4 text-teal" />
                  Resume Quality
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Layout', value: quality.layoutScore },
                    { label: 'Links', value: quality.linksScore },
                    { label: 'Professionalism', value: quality.professionalismScore },
                    { label: 'Readability', value: quality.readabilityScore },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-ink">{item.label}</span>
                        <span className={scoreColor(item.value)}>{Math.round(item.value)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${item.value >= 75 ? 'bg-score-high' : item.value >= 50 ? 'bg-score-mid' : 'bg-score-low'}`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {quality.suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[11px] font-medium text-ink mb-1">Suggestions</p>
                    <p className="text-xs text-muted line-clamp-2">{quality.suggestions[0]}</p>
                  </div>
                )}
                <Link
                  to={latestResume ? `/resume/${latestResume._id}/review` : '#'}
                  className="block text-center text-xs text-muted hover:text-teal transition-colors mt-3 pt-2 border-t border-border"
                >
                  Full review &rarr;
                </Link>
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
                  <IconTargetArrow className="h-4 w-4 text-amber" />
                  ATS Score History
                </div>
                <div className="relative pl-7">
                  <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border" />
                  {atsHistory.slice(0, 3).map((check) => (
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
              <div className="section-title mb-4">
                <IconBolt className="h-4 w-4 text-amber" />
                Quick Actions
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Upload Resume', icon: IconUpload, to: '', action: handleFAB, color: 'text-teal', bg: 'bg-teal-light' },
                  { label: 'ATS Check', icon: IconTargetArrow, to: '/ats', color: 'text-amber', bg: 'bg-amber-light' },
                  { label: 'Cover Letter', icon: IconMail, to: '/cover-letters', color: 'text-teal', bg: 'bg-teal-light' },
                  { label: 'Portfolio', icon: IconGlobe, to: '/portfolio', color: 'text-amber', bg: 'bg-amber-light' },
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

            {latestResume?.detectedRole && (
              <motion.div variants={sectionVariants} className="card">
                <div className="section-title mb-3">
                  <IconUser className="h-4 w-4 text-teal" />
                  Role Profile
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{latestResume.detectedRole.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-light text-teal leading-none">
                        {latestResume.detectedRole.seniority}
                      </span>
                      <span className="text-[10px] text-muted">
                        {Math.round(latestResume.detectedRole.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  {latestResume.detectedRole.industries.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[11px] font-medium text-muted mb-1.5">Industries</p>
                      <div className="flex flex-wrap gap-1">
                        {latestResume.detectedRole.industries.map((ind: string) => (
                          <span key={ind} className="text-[10px] px-2 py-0.5 rounded-full bg-paper text-muted border border-border">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {certCount > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[11px] font-medium text-muted">
                        {certCount} certification{certCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <motion.div variants={sectionVariants} className="card">
              <div className="section-title mb-3">
                <IconArrowRight className="h-4 w-4 text-teal" />
                Next Steps
              </div>
              <div className="space-y-1">
                {[
                  {
                    show: !!latestResume,
                    to: '/ats',
                    icon: IconTargetArrow,
                    bg: 'bg-amber-light',
                    color: 'text-amber',
                    title: 'Check against a job',
                    desc: 'Find missing keywords for your target role.',
                  },
                  {
                    show: true,
                    to: '/cover-letters',
                    icon: IconMail,
                    bg: 'bg-teal-light',
                    color: 'text-teal',
                    title: 'Generate cover letter',
                    desc: 'Write a letter in under a minute.',
                  },
                  {
                    show: !!latestResume,
                    to: `/resume/${latestResume?._id}/review`,
                    icon: IconStar,
                    bg: 'bg-purple-500/10',
                    color: 'text-purple',
                    title: 'Review suggestions',
                    desc: 'Fix weak spots and raise your score.',
                  },
                ]
                  .filter((s) => s.show)
                  .map((step) => {
                    const Icon = step.icon
                    return (
                      <Link
                        key={step.title}
                        to={step.to}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-paper transition-colors group"
                      >
                        <div className={`p-1.5 rounded-lg ${step.bg} shrink-0`}>
                          <Icon className={`h-3.5 w-3.5 ${step.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{step.title}</p>
                          <p className="text-[11px] text-muted">{step.desc}</p>
                        </div>
                        <IconArrowRight className="h-3.5 w-3.5 text-muted group-hover:text-teal transition-colors shrink-0" />
                      </Link>
                    )
                  })}
              </div>
            </motion.div>

            {topMissing.length > 0 && (
              <motion.div variants={sectionVariants} className="card">
                <div className="section-title mb-3">
                  <IconTags className="h-4 w-4 text-amber" />
                  Skill Gaps
                </div>
                <div className="space-y-1.5">
                  {topMissing.map((k) => (
                    <div key={k.keyword} className="flex items-center gap-2 text-sm">
                      <span className="text-xs text-ink flex-1 min-w-0 truncate">{k.keyword}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none shrink-0 ${
                          k.importance === 'critical'
                            ? 'bg-red/10 text-red'
                            : k.importance === 'important'
                            ? 'bg-amber-light text-amber'
                            : 'bg-teal-light text-teal'
                        }`}
                      >
                        {k.importance}
                      </span>
                      {k.count > 1 && (
                        <span className="text-[10px] text-muted shrink-0">×{k.count}</span>
                      )}
                    </div>
                  ))}
                </div>
                <Link
                  to="/ats"
                  className="block text-center text-xs text-muted hover:text-teal transition-colors mt-3 pt-2 border-t border-border"
                >
                  Full ATS analysis &rarr;
                </Link>
              </motion.div>
            )}

            <motion.div variants={sectionVariants} className="card">
              <div className="section-title mb-3">
                <IconTrendingUp className="h-4 w-4 text-muted" />
                Recent Activity
              </div>
              {(() => {
                interface Activity { text: string; time: string; sortKey: string }
                const activities: Activity[] = []

                if (latestResume) {
                  activities.push({
                    text: `Uploaded "${latestResume.title || latestResume.name || 'Untitled'}"`,
                    time: latestResume.updatedAt,
                    sortKey: `a${latestResume.updatedAt}`,
                  })
                }

                if (atsHistory) {
                  atsHistory.slice(0, 3).forEach((check) => {
                    activities.push({
                      text: `ATS check: ${check.score}%${check.jobTitle ? ` for ${check.jobTitle}` : ''}`,
                      time: check.createdAt,
                      sortKey: `b${check.createdAt}`,
                    })
                  })
                }

                if (coverLetters) {
                  coverLetters.slice(0, 3).forEach((cl) => {
                    activities.push({
                      text: `Cover letter for ${cl.jobTitle}${cl.company ? ` at ${cl.company}` : ''}`,
                      time: cl.createdAt,
                      sortKey: `c${cl.createdAt}`,
                    })
                  })
                }

                if (activities.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <div className="empty-state-icon">&amp;</div>
                      <p className="text-xs text-muted">No activity yet</p>
                    </div>
                  )
                }

                activities.sort((a, b) => b.sortKey.localeCompare(a.sortKey))

                return (
                  <div className="space-y-0.5">
                    {activities.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                        <p className="text-sm text-ink min-w-0 truncate">{a.text}</p>
                        <span className="text-[10px] text-muted shrink-0">
                          {new Date(a.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
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
        <IconUpload className="h-5 w-5" />
      </button>
    </div>
  )
}
