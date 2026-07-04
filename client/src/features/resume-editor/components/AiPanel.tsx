import { IconWand, IconSparkles, IconTargetArrow, IconBulb } from '@tabler/icons-react'

interface AiPanelProps {
  score?: number
  strengths?: string[]
  issues?: string[]
  onQuickAction: (action: string) => void
}

export default function AiPanel({ score = 0, strengths = [], issues = [], onQuickAction }: AiPanelProps) {
  const actions = [
    { id: 'improve-summary', label: 'Improve summary', icon: IconSparkles },
    { id: 'rewrite-weak', label: 'Rewrite weak bullets', icon: IconWand },
    { id: 'suggest-skills', label: 'Suggest missing skills', icon: IconBulb },
    { id: 'ats-score', label: 'Check ATS score', icon: IconTargetArrow },
  ]

  const scoreColor = score >= 80 ? 'text-success' : score >= 50 ? 'text-amber' : 'text-danger'
  const strokeDash = 2 * Math.PI * 28
  const progress = Math.min(score, 100) / 100

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" strokeWidth="4" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
              strokeDasharray={strokeDash}
              strokeDashoffset={strokeDash * (1 - progress)}
              className={scoreColor}
              strokeLinecap="round" />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-[14px] font-bold ${scoreColor}`}>
            {score}
          </span>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink">Resume Score</p>
          <p className="text-[10px] text-muted">
            {score >= 80 ? 'Strong resume' : score >= 50 ? 'Needs improvement' : 'Major issues found'}
          </p>
        </div>
      </div>

      {strengths.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Strengths</p>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-[11px] text-success flex items-start gap-1.5">
                <svg className="h-3 w-3 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {issues.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Issues</p>
          <ul className="space-y-1">
            {issues.map((s, i) => (
              <li key={i} className="text-[11px] text-muted flex items-start gap-1.5">
                <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-amber" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Quick Actions</p>
        <div className="space-y-1">
          {actions.map(a => {
            const Icon = a.icon
            return (
              <button
                key={a.id}
                onClick={() => onQuickAction(a.id)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-ink hover:bg-paper-dark transition-colors cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 text-teal" />
                {a.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
