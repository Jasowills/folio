import { cn } from '../lib/utils'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
  scoreClassName?: string
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 6,
  label,
  className,
  scoreClassName,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference

  const color =
    score >= 75 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626'

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className={cn('font-display font-bold fill-current transition-colors duration-1000', scoreClassName)}
          style={{ color, fontSize: size * 0.28 }}
          transform={`rotate(90, ${size / 2}, ${size / 2})`}
        >
          {Math.round(score)}
        </text>
      </svg>
      {label && (
        <span className="label-uppercase text-muted">{label}</span>
      )}
    </div>
  )
}
