import { useState, useRef } from 'react'
import { cn } from '../../../lib/utils'

interface RedFlag {
  message: string
  severity: 'low' | 'medium' | 'high'
  section?: string
}

interface IssueHighlightProps {
  section: string
  flags: RedFlag[]
  children: React.ReactNode
  className?: string
}

const severityColors = {
  low: 'border-l-amber',
  medium: 'border-l-orange',
  high: 'border-l-danger',
}

const severityBgs = {
  low: 'bg-amber/5',
  medium: 'bg-orange/5',
  high: 'bg-danger/5',
}

export default function IssueHighlight({ section: _section, flags, children, className = '' }: IssueHighlightProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  if (!flags || flags.length === 0) {
    return <div className={className}>{children}</div>
  }

  const maxSeverity = flags.reduce((max, f) => {
    const order = { low: 0, medium: 1, high: 2 }
    return order[f.severity] > order[max] ? f.severity : max
  }, 'low' as RedFlag['severity'])

  return (
    <div
      ref={ref}
      className={cn(
        'relative border-l-2 pl-3',
        severityColors[maxSeverity],
        severityBgs[maxSeverity],
        className,
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}

      {showTooltip && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-64 bg-white border border-border rounded-lg shadow-lg p-3"
          style={{ pointerEvents: 'none' }}
        >
          <p className="text-[10px] font-semibold text-ink mb-1.5">
            {flags.length} issue{flags.length > 1 ? 's' : ''} in this section
          </p>
          <ul className="space-y-1">
            {flags.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted">
                <span className={cn(
                  'shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full',
                  f.severity === 'high' ? 'bg-danger' : f.severity === 'medium' ? 'bg-orange' : 'bg-amber',
                )} />
                {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
