import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import {
  IconTargetArrow, IconMail, IconRefresh, IconCircleCheck,
  IconAlertTriangle, IconExternalLink, IconChevronRight,
  IconCoin, IconCalendar, IconUsers, IconMapPin,
} from '@tabler/icons-react'

interface ResearchBriefJob {
  companyName: string
  companyUrl?: string
  usedGeneralKnowledge?: boolean
  roleContext?: { roleTitle: string; resumeId?: string }
  brief: {
    atAGlance: string
    foundedYear: string | null
    fundingStage: string | null
    teamSizeEstimate: string | null
    headquarters: string | null
    industry: string | null
    companySizeSignal: string | null
    mission: string | null
    values: string[] | null
    whatTheyBuild: string
    roleConnection: string | null
    recentNews: Array<{ headline: string; date: string; sourceUrl: string }>
    interviewStyle: { summary: string; confidenceSource: 'careers_page' | 'inferred' }
    questionsToAsk: Array<{ question: string; rationale: string }>
    redFlags: Array<{ flag: string; source: string }> | null
    salaryRange: { estimate: string; confidence: 'high' | 'medium' | 'low' } | null
  }
}

interface Props {
  job: ResearchBriefJob
  onReset: () => void
  onUpgrade: (url: string) => void
  upgradePending?: boolean
}

type Tab = 'overview' | 'interview' | 'news'

export default function ResearchBrief({ job, onReset, onUpgrade, upgradePending }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [upgradeUrl, setUpgradeUrl] = useState('')

  const b = job.brief
  const hasRoleContext = !!job.roleContext?.roleTitle

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'interview', label: 'Interview' },
    { key: 'news', label: 'News & Risks' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header with company info + tabs */}
      <div className="shrink-0 bg-surface border-b border-border">
        {/* Upgrade banner */}
        {job.usedGeneralKnowledge && (
          <div className="flex items-start gap-2.5 p-3 mx-3 mt-3 rounded-lg bg-amber-50 border border-amber-200">
            <IconAlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-800 font-medium">Based on general knowledge</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Add a URL for a sharper brief.</p>
              <div className="flex gap-1.5 mt-2">
                <input
                  value={upgradeUrl}
                  onChange={(e) => setUpgradeUrl(e.target.value)}
                  className="flex-1 min-w-0 text-xs border border-amber-300 rounded px-2 py-1 bg-white outline-none"
                  placeholder="https://company.com"
                />
                <Button variant="primary" size="sm" onClick={() => onUpgrade(upgradeUrl)} disabled={!upgradeUrl || upgradePending} loading={upgradePending}>
                  Upgrade
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Company header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-ink leading-tight">{job.companyName}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {b.industry && (
                  <span className="text-[10px] font-medium bg-teal-light text-teal px-1.5 py-0.5 rounded">{b.industry}</span>
                )}
                {b.companySizeSignal && (
                  <span className="text-xs text-muted">{b.companySizeSignal}</span>
                )}
                {b.salaryRange?.estimate && (
                  <span className="text-xs font-medium text-amber">{b.salaryRange.estimate}</span>
                )}
                {job.companyUrl && (
                  <a href={job.companyUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-muted hover:text-teal transition-colors inline-flex items-center gap-0.5"
                  >
                    {new URL(job.companyUrl).hostname}
                    <IconExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-success inline-flex items-center gap-1">
                <IconCircleCheck className="h-3 w-3" /> Saved
              </span>
              <button onClick={onReset}
                className="text-[11px] font-medium text-muted hover:text-ink transition-colors inline-flex items-center gap-0.5"
              >
                <IconRefresh className="h-3 w-3" /> New
              </button>
            </div>
          </div>

          {/* Key metrics */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted">
            {b.foundedYear && (
              <span className="inline-flex items-center gap-1">
                <IconCalendar className="h-3 w-3" /> Founded {b.foundedYear}
              </span>
            )}
            {b.fundingStage && (
              <span className="inline-flex items-center gap-1">
                <IconCoin className="h-3 w-3" /> {b.fundingStage}
              </span>
            )}
            {b.teamSizeEstimate && (
              <span className="inline-flex items-center gap-1">
                <IconUsers className="h-3 w-3" /> {b.teamSizeEstimate}
              </span>
            )}
            {b.headquarters && (
              <span className="inline-flex items-center gap-1">
                <IconMapPin className="h-3 w-3" /> {b.headquarters}
              </span>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-5 gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'pb-2.5 px-3 text-xs font-medium transition-colors relative',
                tab === t.key
                  ? 'text-ink'
                  : 'text-muted hover:text-ink',
              )}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {tab === 'overview' && <OverviewTab job={job} />}
          {tab === 'interview' && <InterviewTab job={job} navigate={navigate} />}
          {tab === 'news' && <NewsTab job={job} />}

          {/* Next Steps — always visible at bottom */}
          <NextSteps job={job} navigate={navigate} />
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ job }: { job: ResearchBriefJob }) {
  const b = job.brief
  return (
    <>
      {/* At a Glance */}
      <div className="bg-ink rounded-xl p-6 space-y-4">
        <p className="text-base font-display font-bold text-white leading-snug">
          {b.atAGlance}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {b.foundedYear && (
            <span className="text-xs text-teal font-medium">Founded {b.foundedYear}</span>
          )}
          {b.fundingStage && (
            <span className="text-xs text-teal font-medium">{b.fundingStage}</span>
          )}
          {b.teamSizeEstimate && (
            <span className="text-xs text-teal font-medium">{b.teamSizeEstimate}</span>
          )}
          {b.headquarters && (
            <span className="text-xs text-teal font-medium">{b.headquarters}</span>
          )}
        </div>
      </div>

      {/* Mission & Values */}
      {(b.mission || b.values) && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Mission & Values</h3>
          {b.mission && (
            <p className="text-sm text-ink/80 leading-relaxed mb-3">{b.mission}</p>
          )}
          {b.values && b.values.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {b.values.map((v) => (
                <span key={v} className="text-[11px] font-medium bg-teal-light text-teal px-2 py-0.5 rounded">{v}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* What They Build */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">What they build</h3>
        <p className="text-sm text-ink/80 leading-relaxed">{b.whatTheyBuild}</p>
        {b.roleConnection && (
          <div className="mt-4 p-3 rounded-lg bg-teal-light/50 border border-teal/20">
            <p className="text-[11px] font-semibold text-teal-dark mb-1">
              How this connects to the {job.roleContext?.roleTitle || 'applied'} role
            </p>
            <p className="text-sm text-ink/80 leading-relaxed">{b.roleConnection}</p>
          </div>
        )}
      </div>
    </>
  )
}

function InterviewTab({ job, navigate }: { job: ResearchBriefJob; navigate: ReturnType<typeof useNavigate> }) {
  const b = job.brief
  return (
    <>
      {/* Questions to Ask */}
      {b.questionsToAsk.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Smart questions to ask them</h3>
          <p className="text-[11px] text-muted mb-4">Specific to this company, not generic interview filler</p>
          <ol className="space-y-4">
            {b.questionsToAsk.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-teal text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
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

      {/* Interview Style */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">How they likely interview</h3>
        <p className="text-sm text-ink/80 leading-relaxed">{b.interviewStyle.summary}</p>
        <p className="text-[11px] text-muted mt-2">
          {b.interviewStyle.confidenceSource === 'careers_page'
            ? `Based on ${job.companyName}'s careers page`
            : 'Based on general patterns for companies of this size and stage'}
        </p>
        <button
          onClick={() => navigate(
            `/interview/new?company=${encodeURIComponent(job.companyName)}&url=${encodeURIComponent(job.companyUrl || '')}${job.roleContext?.roleTitle ? `&role=${encodeURIComponent(job.roleContext.roleTitle)}` : ''}`
          )}
          className="inline-flex items-center gap-1 text-xs text-teal font-medium hover:text-teal-dark transition-colors mt-3"
        >
          Practice an interview for this company <IconChevronRight className="h-3 w-3" />
        </button>
      </div>
    </>
  )
}

function NewsTab({ job }: { job: ResearchBriefJob }) {
  const b = job.brief
  return (
    <>
      {/* Recent News */}
      {b.recentNews.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Recent news</h3>
          <p className="text-[11px] text-muted mb-4">Bring one of these up — it shows you looked beyond the homepage.</p>
          <div className="space-y-3">
            {b.recentNews.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal mt-2 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink leading-snug">{item.headline}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted">{item.date}</span>
                    {item.sourceUrl && (
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-teal hover:underline inline-flex items-center gap-0.5"
                      >
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

      {/* Red Flags */}
      {b.redFlags && b.redFlags.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <IconAlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Worth knowing before you apply</h3>
          </div>
          <div className="space-y-2.5">
            {b.redFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-ink/80">{flag.flag}</p>
                  <p className="text-[11px] text-muted mt-0.5">Source: {flag.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function NextSteps({ job, navigate }: { job: ResearchBriefJob; navigate: ReturnType<typeof useNavigate> }) {
  const hasRoleContext = !!job.roleContext?.roleTitle
  return (
    <div className="bg-paper rounded-xl p-5">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Next steps</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-lg p-3.5 space-y-2">
          <IconTargetArrow className="h-6 w-6 text-teal" />
          <div>
            <p className="text-xs font-medium text-ink">Practice interview</p>
            <p className="text-[11px] text-muted mt-0.5">Mock interview for {job.companyName}</p>
          </div>
          <Button
            variant="primary" size="sm"
            onClick={() => navigate(
              `/interview/new?company=${encodeURIComponent(job.companyName)}&url=${encodeURIComponent(job.companyUrl || '')}${hasRoleContext ? `&role=${encodeURIComponent(job.roleContext!.roleTitle)}` : ''}`
            )}
            className="w-full"
          >
            Practice
          </Button>
        </div>

        <div className="bg-surface border border-border rounded-lg p-3.5 space-y-2">
          <IconTargetArrow className="h-6 w-6 text-amber" />
          <div>
            <p className="text-xs font-medium text-ink">Tailor your resume</p>
            <p className="text-[11px] text-muted mt-0.5">Check ATS fit for roles here</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/ats')} className="w-full">
            Check fit
          </Button>
        </div>

        <div className="bg-surface border border-border rounded-lg p-3.5 space-y-2">
          <IconMail className="h-6 w-6 text-teal" />
          <div>
            <p className="text-xs font-medium text-ink">Write a cover letter</p>
            <p className="text-[11px] text-muted mt-0.5">Reference what they build</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/cover-letter/new')} className="w-full">
            Write letter
          </Button>
        </div>
      </div>
    </div>
  )
}
