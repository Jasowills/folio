import { cn } from '../../../lib/utils'

interface IssueBadgeProps {
  count: number
  className?: string
}

export default function IssueBadge({ count, className = '' }: IssueBadgeProps) {
  if (count === 0) {
    return (
      <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-medium', className)}>
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        All clear
      </div>
    )
  }

  const severity = count > 5 ? 'high' : count > 2 ? 'medium' : 'low'
  const colors = {
    low: 'bg-amber/10 text-amber',
    medium: 'bg-orange/10 text-orange',
    high: 'bg-danger/10 text-danger',
  }

  return (
    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full font-medium', colors[severity], className)}>
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4m0 4h.01M10.29 3.86l-8.09 14.02A1 1 0 003 20h18a1 1 0 00.8-2.12l-8.09-14.02a1 1 0 00-1.72 0z"/>
      </svg>
      <span className="text-[10px]">{count} issue{count !== 1 ? 's' : ''}</span>
    </div>
  )
}
